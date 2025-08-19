import os
import openai
import json
import traceback

# Ensure API key is loaded
if not openai.api_key:
    openai.api_key = os.getenv("OPENAI_API_KEY")

PORT_MATCHING_PROMPT = """You are analyzing a telecom site diagram.
Use the following context resources:

Site Equipment Reference (port maps, definitions, specs).

Pixel coordinates convention: origin = top-left, first value = row (down), second = column (across).

Computer vision path analysis provides connection endpoints as pixel coordinates. Trust this pixel map data—it is determinative.

Do not guess based on apparent spatial proximity. Instead:

Map each endpoint coordinate to the closest defined port in the reference, using the row to determine which device (radios near the top, basebands lower, routers lower still).

Use the x-coordinate (left→right) to distinguish between ports on the same row (e.g., RI-A vs RI-B).

Cross-check with the official port order from the Site Equipment Reference to assign the correct port ID.

Pair endpoints according to the CV tool’s reported connections, not inferred visual guesswork.

Output the result in JSON, with fields:

{
  "connections": [
    {
      "source": { "node": "<device name>", "port": "<port id>", "pixel": [row, col] },
      "target": { "node": "<device name>", "port": "<port id>", "pixel": [row, col] }
    }
  ]
}


Think very carefully before assigning ports—this is a difficult problem. Check label placement in the diagram, respect device ordering (upper vs lower chassis), and only finalize once everything aligns with both the reference documentation and the CV path data."""

def match_ports_llm(image_url: str, reference_context: str, edge_trace_context: str):
    """
    Matches CV-detected connection endpoints to device ports using an LLM.

    Args:
        image_url: The publicly accessible URL of the diagram image.
        reference_context: The pre-processed reference material (Markdown text).
        edge_trace_context: The JSON output from the Edge Trace (CV) tool.

    Returns:
        A dictionary containing the matched connections or an error structure.
    """
    if not openai.api_key:
        return {"error": "OpenAI API key not configured."}
    if not edge_trace_context:
        return {"error": "Edge Trace (CV) data is required for this tool. Please run that step first."}
    if not reference_context:
        print("Warning: No reference context provided for port matching.")

    try:
        print(f"Sending image to LLM for Port Matching: {image_url}")

        system_msg = {"role": "system", "content": PORT_MATCHING_PROMPT}

        user_msg = {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Analyze the diagram at the provided URL. "
                        "Use the Site Equipment Reference and the CV Path Analysis data below to map the connection endpoints to specific device ports. "
                        "Produce the output in the requested JSON format.\n\n"
                        "**Site Equipment Reference:**\n"
                        f"```markdown\n{reference_context}\n```\n\n"
                        "**CV Path Analysis Data (pixel coordinates):**\n"
                        f"```json\n{edge_trace_context}\n```"
                    ),
                },
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }

        resp = openai.chat.completions.create(
            model="gpt-4o-mini", messages=[system_msg, user_msg], response_format={"type": "json_object"}
        )

        return json.loads(resp.choices[0].message.content)

    except Exception as e:
        print(f"Error during port matching service call: {e}")
        traceback.print_exc()
        raise e