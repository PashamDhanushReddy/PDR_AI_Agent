from django.conf import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from .base import BaseProvider

class GeminiProvider(BaseProvider):
    @property
    def provider_name(self) -> str:
        return 'gemini'

    def get_model(self, identifier: str = '', **kwargs):
        import os
        api_key_name = f'GEMINI_API_KEY{identifier}'
        model_name_env = f'GEMINI_MODEL{identifier}'
        
        api_key = os.environ.get(api_key_name)
        if not api_key and hasattr(settings, api_key_name):
            api_key = getattr(settings, api_key_name)
        if not api_key:
            api_key = 'dummy_key'
            
        model_name = os.environ.get(model_name_env)
        if not model_name and hasattr(settings, model_name_env):
            model_name = getattr(settings, model_name_env)
        if not model_name:
            model_name = 'gemini-1.5-pro-latest'
        
        return ChatGoogleGenerativeAI(
            api_key=api_key,
            model=model_name,
            temperature=kwargs.get('temperature', 0.7),
            timeout=getattr(settings, 'MODEL_TIMEOUT', 30),
            max_retries=getattr(settings, 'MAX_MODEL_RETRIES', 1)
        )
