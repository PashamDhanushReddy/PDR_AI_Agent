import os
import django
from django.conf import settings

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from agent.orchestrator import ModelOrchestrator
from langchain_core.messages import HumanMessage
from django.contrib.auth import get_user_model
from conversations.models import Conversation

User = get_user_model()

def test_fallback():
    print("Testing Model Orchestrator Fallback...")

    user, _ = User.objects.get_or_create(username='test_user_fallback')
    conversation, _ = Conversation.objects.get_or_create(user=user, title='Test Conv')
    
    import os
    os.environ['NVIDIA_API_KEY_2'] = 'dummy_2'
    os.environ['NVIDIA_MODEL_2'] = 'test-model-2'
    # Override settings for the test
    settings.MODEL_FALLBACK_ORDER = 'gemini,nvidia_2'
    settings.ALLOW_MODEL_FALLBACK = True
    
    messages = [HumanMessage(content="Hello!")]
    config = {
        "configurable": {
            "user": user,
            "conversation": conversation,
            "run_id": "test-run-001"
        }
    }
    
    print("\n--- Testing execution ---")
    try:
        response = ModelOrchestrator.execute(messages, tools=[], config=config)
        print("Response received from orchestrator:")
        print(response.content)
    except Exception as e:
        print("Orchestrator failed:", str(e))

    print("\n--- Checking AIRequestLog ---")
    from agent.models import AIRequestLog
    logs = AIRequestLog.objects.filter(request_id="test-run-001").order_by('created_at')
    for log in logs:
        print(f"[{log.status}] Provider: {log.provider} | Model: {log.model} | Latency: {log.latency}s | Error: {log.error_type}")
        
    # Optional: Delete test data
    user.delete()

if __name__ == "__main__":
    test_fallback()
