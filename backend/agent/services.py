from django.conf import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import json

def get_chat_model():
    # Use dummy_key to allow instantiation if env var is missing, though API calls will fail
    api_key = settings.GEMINI_API_KEY if hasattr(settings, 'GEMINI_API_KEY') else 'dummy_key'
    return ChatGoogleGenerativeAI(
        api_key=api_key,
        model="gemini-3.5-flash",
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
    system_prompt_text = (
        "You are PDR AI AGENT, a helpful and highly intelligent AI assistant developed by Pasham Dhanush Reddy. "
        "If asked who created you, developed you, or who your maker is, you must state that you were developed by Pasham Dhanush Reddy. "
        "If the user asks questions about Pasham Dhanush Reddy, his work, skills, or projects, provide a brief summary of him based on the following: "
        "He is an AI/ML Engineer, Python Developer, and Full Stack Developer based in Hyderabad, with expertise in Python, Django, FastAPI, React, and Node.js. "
        "After providing this brief information, you MUST add: 'For more details, please visit his portfolio at https://pashamdhanushreddy.github.io/E-Portfolio/'. Do not just output the link directly without the summary. "
        "CRITICAL: Do NOT output your internal thinking process, reasoning steps, or internal monologues to the user (e.g. do not output 'Here's a thinking process'). Only output the final, direct conversational response. "
        "Also, NEVER mention your 'memory', 'database', or 'background extraction' to the user. Use the provided user information naturally as if you just know it. "
        "IMPORTANT: You have a `generate_image` tool. Whenever a user asks for images, photos, designs, inspirations, or pinterest-style visuals, you MUST use the `generate_image` tool to generate these images. Do NOT attempt to output URLs yourself. When you use this tool, your entire response should be exactly the JSON string returned by the tool. "
        "IMPORTANT: Do NOT force connections to the user's past topics or the creator's portfolio unless the user explicitly asks about them in the current prompt. Keep your answers strictly focused on the user's immediate question.\n"
        f"{memory_context}"
    )
    system_prompt = SystemMessage(content=system_prompt_text)
    
    messages = [system_prompt]
    
    for msg in recent_messages:
        try:
            data = json.loads(msg.content)
            if isinstance(data, dict):
                if data.get("type") == "image":
                    # DO NOT pass massive 800KB base64 strings to the LLM context
                    parsed_content = f"[System: Generated an image with prompt '{data.get('prompt', '')}']"
                elif "text" in data and "image" in data:
                    # Strip base64 attachments from user messages to save tokens if they are huge, 
                    # but typically user attachments are small or Cloudinary URLs.
                    # We'll keep them for now as per original code.
                    parsed_content = [
                        {"type": "text", "text": data["text"]},
                        {"type": "image_url", "image_url": {"url": data["image"]}}
                    ]
                else:
                    parsed_content = msg.content
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
    
    # Pass user and conversation into config for ModelOrchestrator
    run_config = {
        "configurable": {
            "user": user,
            "conversation": conversation
        }
    }
    
    try:
        if kwargs.get('stream', False):
            # Streaming implementation
            def stream_generator():
                try:
                    for chunk in app.stream({"messages": messages}, config=run_config, stream_mode="messages"):
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
                except Exception as stream_err:
                    print(f"Streaming Error: {str(stream_err)}")  # Log internally for debugging
                    yield "\n[Error: Unable to fetch details from the agent at this moment.]"
            return stream_generator()
        else:
            response_state = app.invoke({"messages": messages}, config=run_config)
            final_message = response_state["messages"][-1]
            return final_message.content
    except Exception as e:
        print(f"AI Invocation Error: {str(e)}")  # Log internally for debugging
        error_msg = "[Error: Unable to fetch details from the agent at this moment.]"
        if kwargs.get('stream', False):
            return (chunk for chunk in [error_msg])
        return error_msg
