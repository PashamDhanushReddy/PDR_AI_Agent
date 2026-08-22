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
def web_search(query: str) -> str:
    """Search the web for current information."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = [r for r in ddgs.text(query, max_results=3)]
        if not results:
            return "No results found."
        return "\n".join([f"- {r['title']}: {r['body']}" for r in results])
    except Exception as e:
        return f"Search error: {str(e)}"

tools = [calculator, web_search]
tool_node = ToolNode(tools)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

def call_model(state: AgentState):
    messages = state['messages']
    model = get_chat_model().bind_tools(tools)
    response = model.invoke(messages)
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
