import os
import openai
import json
import traceback

# Ensure API key is loaded (usually done in the main app, but good practice)
if not openai.api_key:
    openai.api_key = os.getenv("OPENAI_API_KEY")

def detect_edges_fewshot(image_url: str, reference_context: str):
    """
    Detects edges in a diagram using an LLM with few-shot prompting.

    Args:
        image_url: The publicly accessible URL of the diagram image.
        reference_context: The pre-processed reference material (Markdown text).

    Returns:
        A dictionary containing the detected edges or an error structure.
        Example Success: {"edges": [{"id": 1, "source": "...", "target": "..."}]}
        Example Error: {"error": "Error message"}
    """
    if not openai.api_key:
        return {"error": "OpenAI API key not configured."}
    if not reference_context:
        print("Warning: No reference context provided for few-shot edge detection.")
        # Decide if you want to proceed without context or return an error/warning
        # return {"error": "Reference context is missing for few-shot detection."}

    try:
        print(f"Sending image to LLM for Few-Shot Edge Detection: {image_url}")

        # Note: Token management (like truncation) is handled before calling this function
        # in the API layer for now, but could be moved here if desired.

        system_msg = {
            "role": "system",
            "content": (
                #"You are an expert system analyzing engineering diagrams (like P&IDs or flowcharts). "
                "You are an expert system analyzing telecommunication site diagrams."
                "Telecommunication Site Diagrams will typically include equipment including Routers, basebands, radio units (RUs) and Antennas"
                "Information about some of these equipment items and their ports can be found in the reference_context document"
                "The reference_context document has links to port map images which can be used to identify and locate individual ports for items of equipment"
                "Your task is to identify the connections (edges, lines, pipes, arrows) between the ports of the equipment nodes shown in the diagram. "
                "Use the provided reference material for context, examples, and conventions when identifying edges. The reference may include text, tables, and image descriptions/links. "
                "Describe each connection by specifying the source and target nodes it connects. Use the labels of the nodes if identifiable, otherwise describe them. "
                "Format the output as a JSON list of objects, where each object has an 'id' (sequential number starting from 1), a 'source' (description of the starting node/point), and a 'target' (description of the ending node/point)."
                "Example Output: [{'id': 1, 'source': 'Baseband BB6648', 'target': 'Router R6630'}, {'id': 2, 'source': 'Baseband BB6648', 'target': 'Radio Unit RU6694'}]"
            )
        }
        user_msg = {
            "role": "user",
            "content": [
                {"type": "text", "text": f"Identify the connections (edges) between components in the diagram at the following URL. Use the reference material below for context and examples. Provide the output in the specified JSON format:\n\n**Reference Material:**\n```markdown\n{reference_context}\n```\n\n**Diagram URL:**"},
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
            ]
        }

        resp = openai.chat.completions.create(
            model="gpt-4o-mini", # Or your preferred model
            messages=[system_msg, user_msg],
            response_format={ "type": "json_object" }
        )

        return json.loads(resp.choices[0].message.content) # Return parsed JSON

    except Exception as e:
        # Let the API layer handle formatting the final JSON error response
        # Log the full error here for debugging
        print(f"Error during few-shot edge detection service call: {e}")
        traceback.print_exc()
        # Re-raise the exception or return a specific error structure
        raise e # Re-raising allows the API layer to catch specific OpenAI errors too