import time
import logging
from django.conf import settings
from .models import AIRequestLog
from .providers.gemini import GeminiProvider
from .providers.openai import OpenAIProvider
from .providers.nvidia import NVIDIAProvider
from langchain_core.messages import AIMessage

logger = logging.getLogger(__name__)

class ModelOrchestrator:
    PROVIDERS = {
        'gemini': GeminiProvider(),
        'openai': OpenAIProvider(),
        'nvidia': NVIDIAProvider(),
    }

    @classmethod
    def get_provider_order(cls):
        order_str = getattr(settings, 'MODEL_FALLBACK_ORDER', 'gemini,openai,nvidia')
        return [p.strip().lower() for p in order_str.split(',') if p.strip()]

    @classmethod
    def execute(cls, messages, tools, config=None):
        if not getattr(settings, 'ALLOW_MODEL_FALLBACK', True):
            order = [cls.get_provider_order()[0]]
        else:
            order = cls.get_provider_order()
            
        chat_model_provider = getattr(settings, 'CHAT_MODEL_PROVIDER', 'auto').lower()
        if chat_model_provider != 'auto':
            if chat_model_provider in cls.PROVIDERS:
                order = [chat_model_provider]

        user = None
        conversation = None
        if config and 'configurable' in config:
            user = config['configurable'].get('user')
            conversation = config['configurable'].get('conversation')
        
        request_id = config.get('run_id', 'unknown') if config else 'unknown'
        
        last_exception = None
        fallback_from = None

        for full_provider_name in order:
            provider_base_name = full_provider_name.split('_')[0] if '_' in full_provider_name else full_provider_name
            identifier = '_' + full_provider_name.split('_', 1)[1] if '_' in full_provider_name else ''
            
            provider = cls.PROVIDERS.get(provider_base_name)
            if not provider:
                logger.warning(f"Provider {provider_base_name} not found in registered providers.")
                continue
                
            model = provider.get_model(identifier=identifier)
            
            bound_model = model
            if tools:
                try:
                    bound_model = model.bind_tools(tools)
                except Exception as e:
                    logger.warning(f"Provider {full_provider_name} does not support binding tools: {str(e)}")
                    # Proceed without tools. For some providers this may cause LangGraph logic to fail,
                    # but we'll try our best.
                    pass

            start_time = time.time()
            try:
                # If we pass config, we MUST ensure the model gets the callbacks for streaming!
                response = bound_model.invoke(messages, config=config)
                
                latency = time.time() - start_time
                
                if user and conversation:
                    AIRequestLog.objects.create(
                        request_id=str(request_id),
                        user=user,
                        conversation=conversation,
                        provider=full_provider_name,
                        model=getattr(model, 'model', getattr(model, 'model_name', 'unknown')),
                        status='success',
                        latency=latency,
                        fallback_from=fallback_from
                    )
                return response
                
            except Exception as e:
                latency = time.time() - start_time
                error_msg = str(e)
                
                if user and conversation:
                    AIRequestLog.objects.create(
                        request_id=str(request_id),
                        user=user,
                        conversation=conversation,
                        provider=full_provider_name,
                        model=getattr(model, 'model', getattr(model, 'model_name', 'unknown')),
                        status='failed',
                        latency=latency,
                        fallback_from=fallback_from,
                        error_type=error_msg
                    )
                
                logger.error(f"Provider {full_provider_name} failed: {error_msg}")
                last_exception = e
                fallback_from = full_provider_name
                
                if "ValidationError" in error_msg or "OutputParserException" in error_msg:
                    raise e
                
                continue
                
        # If all failed
        if last_exception:
            raise Exception("All fallback providers failed.") from last_exception
        else:
            raise Exception("No valid providers configured for execution.")
