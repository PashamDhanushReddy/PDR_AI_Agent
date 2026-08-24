from typing import Annotated, TypedDict, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_google_genai import ChatGoogleGenerativeAI
from django.conf import settings

def get_chat_model():
    api_key = settings.GEMINI_API_KEY if hasattr(settings, 'GEMINI_API_KEY') else 'dummy_key'
    return ChatGoogleGenerativeAI(
        api_key=api_key,
        model="gemini-3.5-flash",
        temperature=0.7
    )

import requests
import base64
import json

@tool
def generate_image(prompt: str) -> str:
    """
    Generate an image when the user explicitly requests an image, illustration, visualization, diagram, artwork, portrait, logo, scene, or other visual content.
    Do not use this tool for normal text explanations or programming requests.
    IMPORTANT: When you use this tool, your final response MUST be EXACTLY the JSON string returned by this tool. Do not wrap it in markdown or add extra text.
    """
    account_id = getattr(settings, 'CLOUDFLARE_ACCOUNT_ID', None)
    api_token = getattr(settings, 'CLOUDFLARE_API_TOKEN', None)
    model = getattr(settings, 'IMAGE_GENERATION_MODEL', '@cf/black-forest-labs/flux-1-schnell')

    if not account_id or not api_token:
        return 'Error: Cloudflare API credentials are not configured. Please check environment variables.'

    api_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"

    try:
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "prompt": prompt
        }
        response = requests.post(api_url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()

        response_json = response.json()
        if not response_json.get("success"):
            return f'Error from Cloudflare API: {json.dumps(response_json.get("errors", []))}'
        
        # Cloudflare direct API returns the base64 image in result.image
        base64_img = response_json["result"]["image"]
        
        data_uri = f"data:image/jpeg;base64,{base64_img}"
        
        # Return the exact JSON schema required by frontend
        return json.dumps({
            "type": "image",
            "image": data_uri,
            "prompt": prompt,
            "model": model
        })

    except requests.exceptions.Timeout:
        return 'Error: Image generation timed out.'
    except requests.exceptions.RequestException as e:
        return f'Error generating image: {str(e)}'
    except Exception as e:
        return f'Unexpected error: {str(e)}'

# Define tools
@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        return str(eval(expression, {"__builtins__": None}, {}))
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"



# A dummy web search tool for simplicity
@tool
def web_search(query: str, max_results: int = 5) -> str:
    """Search the web for current information. Returns titles, snippets, and URLs."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=max_results)]
        if not results:
            return "No results found."
        return "\n".join([f"- Title: {r['title']}\n  Snippet: {r['body']}\n  URL: {r['href']}" for r in results])
    except Exception as e:
        return f"Search error: {str(e)}"

@tool
def fetch_webpage(url: str) -> str:
    """Fetch and extract the main text content from a specific URL. Use this to read full articles, job descriptions, or details from a link found via web_search."""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator='\n')
        # clean up empty lines
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Limit to 15000 characters to prevent context overflow
        return text[:15000]
    except Exception as e:
        return f"Error fetching webpage: {str(e)}"

tools = [calculator, web_search, fetch_webpage, generate_image]
tool_node = ToolNode(tools)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

from langchain_core.runnables import RunnableConfig

def call_model(state: AgentState, config: RunnableConfig = None):
    messages = state['messages']
    
    from .orchestrator import ModelOrchestrator
    response = ModelOrchestrator.execute(messages, tools, config=config)
    
    return {"messages": [response]}

# Define the graph
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges(
    "agent",
    tools_condition,
)
workflow.add_edge("tools", "agent")

app = workflow.compile()
