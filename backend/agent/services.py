from django.conf import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import json

def get_chat_model():
    # Use dummy_key to allow instantiation if env var is missing, though API calls will fail
    api_key = settings.GEMINI_API_KEY if hasattr(settings, 'GEMINI_API_KEY') else 'dummy_key'
    return ChatGoogleGenerativeAI(
        api_key=api_key,
        model="gemini-1.5-pro",
        temperature=0.7
    )

def process_chat_message(user, conversation, content, **kwargs):
    """
    Basic chat processor for Phase 2.
    It takes user message, sends it to OpenAI, and returns AI response content.
    """
    # Fetch recent short-term history
    recent_messages = conversation.messages.order_by('-created_at')[:10]
    # Reverse to chronological order
    recent_messages = list(reversed(recent_messages))
    
    # Fetch long-term semantic memories
    from memory.manager import retrieve_relevant_memories
    memories = retrieve_relevant_memories(user, content, limit=3)
    
    # Format memories for system prompt
    memory_context = ""
    if memories:
        memory_context = "\n\nRelevant information about the user:\n" + "\n".join([f"- {m}" for m in memories])
    
    # Build System Message with Memory Context
    system_prompt = SystemMessage(content=f"You are a helpful AI assistant.{memory_context}")
    
    messages = [system_prompt]
    
    for msg in recent_messages:
        try:
            data = json.loads(msg.content)
            if isinstance(data, dict) and "text" in data and "image" in data:
                parsed_content = [
                    {"type": "text", "text": data["text"]},
                    {"type": "image_url", "image_url": {"url": data["image"]}}
                ]
            else:
                parsed_content = msg.content
        except Exception:
            parsed_content = msg.content

        if msg.role == 'user':
            messages.append(HumanMessage(content=parsed_content))
        elif msg.role == 'assistant':
            messages.append(AIMessage(content=msg.content))
            
    # Add current message
    try:
        data = json.loads(content)
        if isinstance(data, dict) and "text" in data and "image" in data:
            current_parsed = [
                {"type": "text", "text": data["text"]},
                {"type": "image_url", "image_url": {"url": data["image"]}}
            ]
        else:
            current_parsed = content
    except Exception:
        current_parsed = content
        
    messages.append(HumanMessage(content=current_parsed))
    
    from .graph import app
    try:
        if kwargs.get('stream', False):
            # Streaming implementation
            def stream_generator():
                for chunk in app.stream({"messages": messages}, stream_mode="messages"):
                    # Extract the content from AIMessageChunk
                    # The chunk is a tuple if using stream_mode="messages"
                    msg_chunk, _ = chunk
                    if isinstance(msg_chunk, AIMessage) and msg_chunk.content:
                        if isinstance(msg_chunk.content, list):
                            text = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in msg_chunk.content])
                            if text:
                                yield text
                        else:
                            yield str(msg_chunk.content)
            return stream_generator()
        else:
            response_state = app.invoke({"messages": messages})
            final_message = response_state["messages"][-1]
            return final_message.content
    except Exception as e:
        if kwargs.get('stream', False):
            return (chunk for chunk in [f"Error connecting to AI: {str(e)}"])
        return f"Error connecting to AI: {str(e)}"
