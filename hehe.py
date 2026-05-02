import os
from typing import Annotated
from typing_extensions import TypedDict
from dotenv import load_dotenv

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import ToolNode, tools_condition

# 1. Configuration & Setup
load_dotenv()

# Define the State
class State(TypedDict):
    # This keeps track of the conversation and agent thought process
    messages: Annotated[list, add_messages]

# 2. Define Tools and LLM
# Using Tavily for real-time web data as per constraints
search_tool = TavilySearchResults(max_results=5) 
tools = [search_tool]

# Initialize LLM and bind tools
llm = ChatGroq(model="llama-3.1-8b-instant")
llm_with_tools = llm.bind_tools(tools)

# 3. Define Node Functions
def research_agent(state: State):
    """The 'brain' of the agent that decides to search or answer."""
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

# 4. Build the Graph
builder = StateGraph(State)

# Add Nodes
builder.add_node("agent", research_agent)
builder.add_node("tools", ToolNode(tools))

# Define Edges
builder.add_edge(START, "agent")

# Multi-step reasoning: If LLM calls a tool, go to 'tools', 
# then ALWAYS go back to 'agent' to synthesize the result.
builder.add_conditional_edges(
    "agent",
    tools_condition, # This checks if the LLM wants to use a tool
)

# After tools are executed, return to the agent for synthesis
builder.add_edge("tools", "agent") 

# Compile the graph
graph = builder.compile()

# 5. Execute Research
input_query = {
    "messages": [
        ("user", "Perform deep research on the current state of NVIDIA stock and recent AI hardware announcements.")
    ]
}

# Stream the steps to see the "Autonomous" reasoning in action
for event in graph.stream(input_query, stream_mode="values"):
    if "messages" in event:
        event["messages"][-1].pretty_print()