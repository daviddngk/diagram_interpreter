import os
import openai
import requests
import json
import traceback

# --- Configuration ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY is not configured")
else:
    openai.api_key = OPENAI_API_KEY

DIAGRAM_CLASSIFICATION_PROMPT = """You are a diagram analysis assistant. Your task is to classify the visual representation style(s) used in a diagram image. Diagrams may fall into one or more of the following categories:

1. **Abstract Geometric**: Components are represented using simple geometric shapes (e.g., rectangles, circles, lines) with little or no standardized meaning. Labels and layout may provide additional context, but shapes alone do not imply component function.

2. **Symbolic**: Components are shown using standardized symbols or icons that imply their function. These could be electronic circuit symbols (e.g., resistors, capacitors), or IT/network icons (e.g., routers, switches). Interpretation relies on knowledge of the domain and visual conventions.

3. **Realistic**: Components are represented using realistic or photorealistic images that resemble physical devices. These images may show detailed features like ports, buttons, or indicators. Scale is often approximate and may vary from one component to another.

4. **Spatial (Physical Layout)**: The diagram reflects the physical location or spatial arrangement of components, such as a rack elevation, floor plan, or equipment layout. Position conveys physical relationships rather than logical or functional flow.

5. **Hybrid**: The diagram uses elements from two or more of the categories above (e.g., symbolic components inside a spatial layout, or realistic images mixed with abstract shapes).

---

**Instructions**:

1. Examine the image provided.
2. Decide which representation type(s) apply.
3. Provide a short explanation of the visual cues that led to your decision.
4. Return ONLY a valid JSON object with the classification and rationale. Do not include any other text or markdown formatting like ```json before or after the JSON object.

**Output format (ensure this exact JSON structure):**

{
  "representation_types": ["Symbolic", "Spatial"],
  "confidence": 0.91,
  "rationale": "Network elements are depicted using standardized icons, and the overall layout reflects rack positions. Ports are symbolic, and component placement aligns with spatial orientation."
}
"""

def classify_diagram_from_url(image_url: str):
    """
    Classifies a diagram from a given image URL using a generative AI model.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API Key is not configured. Please set the OPENAI_API_KEY environment variable.")

    # 1. Pre-flight check for image URL
    try:
        head_response = requests.head(image_url, timeout=10)
        head_response.raise_for_status()
        content_type = head_response.headers.get('content-type')
        if not content_type or not content_type.startswith('image/'):
            raise ValueError(f"URL does not appear to point to a valid image. Content-Type: {content_type}")
    except requests.exceptions.RequestException as req_err:
        print(f"Failed to verify image URL {image_url}: {req_err}")
        raise ValueError(f"Could not access or verify image at URL: {image_url}. Error: {req_err}")

    # 2. OpenAI API Call and Processing
    try: 
        # Construct messages for OpenAI API

        messages = [
            {
                "role": "system",
                "content": DIAGRAM_CLASSIFICATION_PROMPT # The main prompt acts as the system message
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Please classify the diagram provided in the image URL according to the instructions."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url,
                        },
                    },
                ],
            }
        ]


        # Use a model that supports vision, like "gpt-4o" or "gpt-4-turbo"
        # "gpt-4o-mini" is also a good option for cost/performance balance
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            # Ensure the model is instructed to return JSON. The prompt already does this.
            # For newer OpenAI models, you can also use response_format={"type": "json_object"}
            # if the prompt is structured to guarantee a JSON object at the root.
            # However, your prompt is very specific, so direct parsing should work.
            max_tokens=500 # Adjust as needed
        )

        raw_text = response.choices[0].message.content
        try:
            classification_result = json.loads(raw_text)
            return classification_result
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from LLM response: {e}")
            print(f"Raw LLM response text: {raw_text}")
            raise ValueError(f"OpenAI LLM did not return valid JSON. Response: {raw_text}")
    except openai.APIError as api_e: # Catch OpenAI specific API errors
        print(f"OpenAI API Error: {api_e}")
        error_message = f"OpenAI API error during classification: {api_e}"
        # Check for common image access issues if the error message indicates it
        if hasattr(api_e, 'message') and ("Could not retrieve image" in api_e.message or "Failed to download image" in api_e.message):
            error_message = f"OpenAI model failed to access the image at the provided URL: {image_url}. Ensure the object exists and is publicly readable or the URL is valid."
        raise ValueError(error_message) # Re-raise as ValueError for consistent handling in services_api.py
    except Exception as e: # Catch any other unexpected errors during OpenAI call or processing
        print(f"An unexpected error occurred during diagram classification: {e}")
        traceback.print_exc() # Print full traceback for unexpected issues 
        raise # Re-raise the original exception or a new ValueError("Unexpected error during classification")

# Example usage (for testing this file directly)
# if __name__ == '__main__':
#     test_image_url = "YOUR_TEST_PUBLIC_IMAGE_URL_HERE" # Replace with a public image URL
#     if test_image_url != "YOUR_TEST_PUBLIC_IMAGE_URL_HERE" and OPENAI_API_KEY:
#         try:
#             result = classify_diagram_from_url(test_image_url)
#             print(json.dumps(result, indent=2))
#         except Exception as e:
#             print(f"Error in example usage: {e}")
#     else:
#         print("Please set OPENAI_API_KEY and provide a test_image_url to run the example.")