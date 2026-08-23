import json
from langchain_core.messages import SystemMessage, HumanMessage
from agent.services import get_chat_model
from .models import UserMemory

EXTRACTOR_SYSTEM_PROMPT = """
You are a memory extraction assistant. Analyze the recent conversation between the User and the Assistant.
Extract long-term, durable information about the User.
Focus on: preferences, skills, goals, projects, decisions, and recurring interests.
Ignore casual conversation, temporary needs, or greetings.

Return a JSON object matching this schema:
{
  "actions": [
    {
      "action": "create",
      "content": "Detailed fact about the user",
      "category": "preference|skill|goal|project|personal|other",
      "importance": 1-10
    },
    {
      "action": "update",
      "old_content_keyword": "keyword to identify old memory",
      "content": "Updated fact",
      "category": "preference",
      "importance": 8
    },
    {
      "action": "delete",
      "old_content_keyword": "keyword to identify memory to delete"
    }
  ]
}
If there is nothing new to store, return {"actions": []}.
Always return ONLY valid JSON.
"""

def extract_memories(user, conversation, current_message_content):
    recent_messages = conversation.messages.order_by('-created_at')[:5]
    recent_messages = list(reversed(recent_messages))
    
    chat_history = ""
    for msg in recent_messages:
        chat_history += f"{msg.role.capitalize()}: {msg.content}\n"
        
    messages = [
        SystemMessage(content=EXTRACTOR_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation:\n{chat_history}\nExtract memories.")
    ]
    
    from agent.orchestrator import ModelOrchestrator
    from django.conf import settings
    
    # Optional context config for the orchestrator to log memory extraction correctly
    run_config = {
        "configurable": {
            "user": user,
            "conversation": conversation
        }
    }
    
    try:
        if getattr(settings, 'MEMORY_MODEL_PROVIDER', 'auto').lower() == 'auto':
            # Use Orchestrator for fallback and tracking
            response = ModelOrchestrator.execute(messages, tools=None, config=run_config)
            content = response.content.strip()
        else:
            # Direct usage if specifically disabled for memory
            llm = get_chat_model()
            response = llm.invoke(messages)
            content = response.content.strip()
            
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        data = json.loads(content)
        return data.get('actions', [])
    except Exception as e:
        print(f"Memory extraction error: {e}")
        return []

