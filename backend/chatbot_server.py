import os
import json
from flask import Flask, request, jsonify
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

# Initialize Flask app
app = Flask(__name__)

# Get API key from environment variable (set this in Render dashboard)
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
if not os.environ["GOOGLE_API_KEY"]:
    raise ValueError("Missing GOOGLE_API_KEY environment variable.")

# Initialize Gemini model
llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash-latest", temperature=0.3)

def classify_usage(state: dict) -> dict:
    appliance_list_str = ', '.join([f"{app['name']}: {app['count']} ({app['rating']}★)" for app in state.get('appliances', [])])
    prompt = (
        "You are an energy expert. Classify electricity usage as Low, Moderate, or High.\n"
        f"User type: {state['user_type']}\n"
        f"Monthly usage: {state['usage_kwh']} kWh\n"
        f"Appliances: {appliance_list_str}.\n"
        "Respond with only one word."
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    state["usage_level"] = response.content.strip()
    return state

def get_recommendations(state: dict) -> dict:
    appliance_list_str = ', '.join([f"{app['name']}: {app['count']} ({app['rating']}★)" for app in state.get('appliances', [])])
    prompt = f"""
    You are an energy consultant. Based on the following information, provide recommendations.
    User type: {state['user_type']}
    Monthly usage: {state['usage_kwh']} kWh ({state['usage_level']}).
    Appliances: {appliance_list_str}.
    Your response must be a JSON object with three properties:
    1. "tips for less electric uses": An array of 3 concise tips for reducing electricity consumption.
    2. "Idea for Renewable energy": An array of 1-2 ideas for implementing renewable energy.
    3. "suggested plan and cost for Renewable anergy": An array of 1-2 points outlining a simple plan and estimated cost. Costs should be illustrative and start with "e.g.,".
    Ensure all points are short, accurate, and actionable.
    """
    
    try:
        response = llm.invoke([HumanMessage(content=prompt)], response_mime_type="application/json")
        recommendations_data = json.loads(response.content)
    except Exception as e:
        print(f"Error calling LLM or parsing response: {e}")
        recommendations_data = {
            "tips for less electric uses": ["Could not generate tips."],
            "Idea for Renewable energy": ["Could not generate ideas."],
            "suggested plan and cost for Renewable anergy": ["Could not generate a plan."]
        }
    
    return {"recommendations": recommendations_data}

@app.route('/api/recommendations', methods=['POST'])
def handle_recommendations():
    data = request.json
    state = {
        "user_type": data.get("user_type"),
        "appliances": data.get("appliances"),
        "usage_kwh": data.get("usage_kwh"),
    }
    
    classified_state = classify_usage(state)
    final_state = get_recommendations(classified_state)
    
    return jsonify(final_state["recommendations"])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
