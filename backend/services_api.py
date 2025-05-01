# backend/services_api.py
import os
import datetime
import uuid
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import storage
import requests # To fetch image from URL
from PIL import Image # To open image for OCR/YOLO
import io # To handle image bytes
import openai # For analyze_diagram_from_url
import traceback # For detailed error logging
import json # For potentially parsing LLM response if needed

# Import your service functions
from services.ocr_engine import extract_text_blocks
# Note: analyze_diagram_from_url is defined locally in this file now
# from services.node_detector_yolo import detect_equipment_nodes # No longer using YOLO for this endpoint

load_dotenv()

# --- GCS Configuration ---
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
storage_client = None # Initialize as None
try:
    # Check for credentials first
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        print("Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not set. GCS features disabled.")
    elif not GCS_BUCKET_NAME:
        print("Warning: GCS_BUCKET_NAME environment variable not set. GCS features disabled.")
    else:
        # Attempt to initialize only if credentials and bucket name are set
        storage_client = storage.Client()
        # Test connection by trying to get the bucket (optional, but good practice)
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        print(f"GCS Client initialized and connected to bucket: {GCS_BUCKET_NAME}")
except Exception as e:
    print(f"Error initializing Google Cloud Storage client: {e}. GCS features disabled.")
    storage_client = None # Ensure it's None on error
# ---------------------

# --- OpenAI Configuration ---
# Load API key during initialization
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    print("Warning: OPENAI_API_KEY environment variable not set. OpenAI features disabled.")
# --------------------------

app = Flask(__name__)

# --- Explicit CORS Configuration ---
# Allow requests specifically from your frontend development server origin
# for the routes that the frontend needs to call.
cors = CORS(app, resources={
    r"/generate-upload-url": {"origins": "http://localhost:3000"},
    r"/analyze": {"origins": "http://localhost:3000"},
    r"/analyze/ocr": {"origins": "http://localhost:3000"}, # Added OCR route
    r"/analyze/nodes": {"origins": "http://localhost:3000"}, # Add Node Detection route
    r"/analyze/edges": {"origins": "http://localhost:3000"}  # Add Edge Detection route
})
# Note: For production, you would replace or add your deployed frontend URL.
# Example: {"origins": ["http://localhost:3000", "https://your-deployed-app.com"]}
# ---------------------------------

# --- Route: Generate GCS Signed URL ---
@app.route("/generate-upload-url", methods=["POST"])
def generate_upload_url_route():
    if not storage_client:
        return jsonify({"error": "GCS client not initialized on server."}), 500
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON request body"}), 400

        original_filename = data.get("filename")
        content_type = data.get("contentType")

        if not original_filename or not content_type:
            return jsonify({"error": "Missing 'filename' or 'contentType' in request"}), 400

        # Create a unique name for the blob to avoid collisions
        file_ext = os.path.splitext(original_filename)[1]
        unique_blob_name = f"{uuid.uuid4()}{file_ext}"

        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(unique_blob_name)

        # Generate the signed URL for PUT request
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=15), # URL valid for 15 minutes
            method="PUT",
            content_type=content_type, # Crucial for the client upload
        )

        # Construct the public URL (assuming public access or signed URL access later)
        # Note: For truly public access, bucket/object ACLs must be set correctly in GCS
        public_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{unique_blob_name}"

        return jsonify({"signedUrl": signed_url, "publicUrl": public_url})

    except Exception as e:
        print(f"Error in /generate-upload-url: {e}")
        traceback.print_exc() # Print full traceback to server logs
        return jsonify({"error": f"Failed to generate signed URL: {str(e)}"}), 500

# --- Route: Analyze Diagram (Original OpenAI Description) ---
@app.route("/analyze", methods=["POST"])
def analyze_route():
    if not openai.api_key:
         return jsonify({"error": "OpenAI API key not configured on server."}), 500
    try:
        data = request.get_json()
        if not data or "image_url" not in data:
             return jsonify({"error": "Missing 'image_url' in JSON request body"}), 400

        image_url = data["image_url"]
        # Call the helper function defined below
        return analyze_diagram_from_url(image_url)

    except Exception as e:
        print(f"Error in /analyze route: {e}")
        traceback.print_exc()
        # Return a generic error message, details are logged
        return jsonify({"error": "An unexpected error occurred during analysis."}), 500

# --- Helper function for OpenAI Diagram Analysis ---
def analyze_diagram_from_url(image_url):
    """
    Sends the image URL to OpenAI GPT-4o-mini for description.
    """
    system_msg = {
        "role": "system",
        "content": "You are a helpful assistant that describes diagrams."
    }
    user_msg = {
        "role": "user",
        "content": [
            {"type": "text", "text": "Describe the diagram found at this URL:"},
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url,
                    # "detail": "auto" # Default detail level
                },
            },
        ]
    }
    try:
        # API key is checked globally now, but double-check doesn't hurt
        if not openai.api_key:
             raise ValueError("OpenAI API key not configured.")

        resp = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[system_msg, user_msg],
            # max_tokens=1000 # Optional: Limit response length
        )
        description = resp.choices[0].message.content
        return jsonify({"description": description, "url": image_url})

    except openai.BadRequestError as e:
        # Specific handling for OpenAI API errors (like invalid URL access)
        print(f"OpenAI API BadRequestError: {e}")
        error_message = f"Could not analyze the image via OpenAI. The API reported an error: {e}"
        # Check for common image access issues
        if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
             error_message = f"Could not analyze the image via OpenAI. The model failed to access the image at the provided GCS URL: {image_url}. Ensure the object exists and is publicly readable or the URL is valid."
        # Return 400 for client-side errors (like bad URL)
        return jsonify({"error": error_message}), 400
    except Exception as e:
        # Handle other potential exceptions during the API call
        print(f"An unexpected error occurred during OpenAI call: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during OpenAI analysis."}), 500

# --- Route: OCR Analysis ---
@app.route('/analyze/ocr', methods=['POST'])
def handle_ocr_analysis():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body"}), 400

    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body"}), 400

    try:
        # 1. Fetch the image from the URL
        print(f"Fetching image for OCR from: {image_url}")
        response = requests.get(image_url, stream=True, timeout=30) # Timeout for fetching
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        # 2. Open the image using Pillow from bytes
        img = Image.open(io.BytesIO(response.content))

        # 3. Perform OCR using the imported service function
        print("Running OCR...")
        ocr_results = extract_text_blocks(img) # Call your function from ocr_engine.py
        print(f"OCR found {len(ocr_results)} text blocks.")

        # 4. Return the results
        return jsonify(ocr_results) # Return the list of blocks directly

    except requests.exceptions.Timeout:
         print(f"Timeout error fetching image for OCR from URL: {image_url}")
         return jsonify({"error": f"Timeout fetching image from URL: {image_url}"}), 504 # Gateway Timeout
    except requests.exceptions.RequestException as e:
        # Handle errors during image fetching (network issues, invalid URL, 404 etc.)
        print(f"Error fetching image for OCR from URL {image_url}: {e}")
        return jsonify({"error": f"Failed to fetch image from URL: {e}"}), 502 # Bad Gateway (or 400 if client URL error)
    except Exception as e:
        # Catch potential errors from Pillow or Tesseract/ocr_engine
        print(f"Error during OCR processing: {e}")
        traceback.print_exc()
        return jsonify({"error": f"An error occurred during OCR processing: {str(e)}"}), 500

# --- Route: Node Detection Analysis (using LLM) ---
@app.route('/analyze/nodes', methods=['POST'])
def handle_node_detection_llm(): # Renamed function for clarity
    if not openai.api_key:
         return jsonify({"error": "OpenAI API key not configured on server."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body"}), 400

    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body"}), 400

    try:
        # --- Call OpenAI for Node Detection ---
        print(f"Sending image to LLM for Node Detection: {image_url}")

        system_msg = {
            "role": "system",
            "content": (
                "You are an expert system analyzing engineering diagrams (like P&IDs or flowcharts). "
                "Your task is to identify distinct equipment nodes or components shown in the diagram. "
                "List each identified node with a brief label or description. "
                "Format the output as a JSON list of objects, where each object has a 'id' (sequential number starting from 1) and a 'label' (the identified node description)."
                "Example Output: [{'id': 1, 'label': 'Pump P-101'}, {'id': 2, 'label': 'Heat Exchanger E-203'}, {'id': 3, 'label': 'Storage Tank T-50'}]"
            )
        }
        user_msg = {
            "role": "user",
            "content": [
                {"type": "text", "text": "Identify the equipment nodes in the diagram at this URL and provide the output in the specified JSON format:"},
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
            ]
        }

        resp = openai.chat.completions.create(
            model="gpt-4o-mini", # Or your preferred model
            messages=[system_msg, user_msg],
            response_format={ "type": "json_object" } # Request JSON output
            # max_tokens=500 # Optional
        )

        # Attempt to parse the JSON response from the LLM
        node_results_json_string = resp.choices[0].message.content
        print(f"LLM Node Detection Raw Response: {node_results_json_string}")

        # Parse the JSON string from the LLM into a Python object
        # Add error handling in case the LLM doesn't return valid JSON despite the request
        try:
            node_results = json.loads(node_results_json_string)
        except json.JSONDecodeError as json_err:
            print(f"Error decoding JSON from LLM response: {json_err}")
            print(f"LLM Raw Content: {node_results_json_string}")
            return jsonify({"error": "LLM did not return valid JSON for node detection.", "raw_response": node_results_json_string}), 500

        return jsonify(node_results) # Return the parsed Python object (Flask will serialize it)

    # --- Error Handling (similar to /analyze route) ---
    except requests.exceptions.Timeout:
         print(f"Timeout error fetching image for Node Detection from URL: {image_url}")
         return jsonify({"error": f"Timeout fetching image from URL: {image_url}"}), 504 # Gateway Timeout
    except requests.exceptions.RequestException as e:
        print(f"Error fetching image for Node Detection from URL {image_url}: {e}")
        return jsonify({"error": f"Failed to fetch image from URL: {e}"}), 502 # Bad Gateway (or 400 if client URL error)
    except openai.BadRequestError as e:
        print(f"OpenAI API BadRequestError during Node Detection: {e}")
        error_message = f"Could not perform node detection via OpenAI. The API reported an error: {e}"
        if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
             error_message = f"Could not perform node detection via OpenAI. The model failed to access the image at the provided GCS URL: {image_url}. Ensure the object exists and is publicly readable or the URL is valid."
        return jsonify({"error": error_message}), 400
    except Exception as e:
        print(f"An unexpected error occurred during LLM Node Detection: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during Node Detection analysis."}), 500

# --- Route: Edge Detection Analysis (using LLM) ---
@app.route('/analyze/edges', methods=['POST'])
def handle_edge_detection_llm():
    if not openai.api_key:
         return jsonify({"error": "OpenAI API key not configured on server."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body"}), 400

    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body"}), 400

    try:
        # --- Call OpenAI for Edge Detection ---
        print(f"Sending image to LLM for Edge Detection: {image_url}")

        system_msg = {
            "role": "system",
            "content": (
                "You are an expert system analyzing engineering diagrams (like P&IDs or flowcharts). "
                "Your task is to identify the connections (edges, lines, pipes, arrows) between the equipment nodes or components shown in the diagram. "
                "Describe each connection by specifying the source and target nodes it connects. Use the labels of the nodes if identifiable, otherwise describe them. "
                "Format the output as a JSON list of objects, where each object has an 'id' (sequential number starting from 1), a 'source' (description of the starting node/point), and a 'target' (description of the ending node/point)."
                "Example Output: [{'id': 1, 'source': 'Pump P-101', 'target': 'Heat Exchanger E-203 Inlet'}, {'id': 2, 'source': 'Heat Exchanger E-203 Outlet', 'target': 'Storage Tank T-50'}]"
            )
        }
        user_msg = {
            "role": "user",
            "content": [
                {"type": "text", "text": "Identify the connections (edges) between components in the diagram at this URL and provide the output in the specified JSON format:"},
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
            ]
        }

        resp = openai.chat.completions.create(
            model="gpt-4o-mini", # Or your preferred model
            messages=[system_msg, user_msg],
            response_format={ "type": "json_object" } # Request JSON output
            # max_tokens=1000 # Optional
        )

        edge_results_json_string = resp.choices[0].message.content
        print(f"LLM Edge Detection Raw Response: {edge_results_json_string}")

        try:
            edge_results = json.loads(edge_results_json_string)
        except json.JSONDecodeError as json_err:
            print(f"Error decoding JSON from LLM response for edges: {json_err}")
            print(f"LLM Raw Content: {edge_results_json_string}")
            return jsonify({"error": "LLM did not return valid JSON for edge detection.", "raw_response": edge_results_json_string}), 500

        return jsonify(edge_results)

    # --- Error Handling (similar to node detection) ---
    except openai.BadRequestError as e: # Catch OpenAI specific errors first
        print(f"OpenAI API BadRequestError during Edge Detection: {e}")
        error_message = f"Could not perform edge detection via OpenAI. The API reported an error: {e}"
        if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
             error_message = f"Could not perform edge detection via OpenAI. The model failed to access the image at the provided GCS URL: {image_url}. Ensure the object exists and is publicly readable or the URL is valid."
        return jsonify({"error": error_message}), 400
    except Exception as e: # Catch other general exceptions
        print(f"An unexpected error occurred during LLM Edge Detection: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during Edge Detection analysis."}), 500


if __name__ == "__main__":
    # Perform checks for essential environment variables on startup
    missing_vars = []
    if not GCS_BUCKET_NAME: missing_vars.append("GCS_BUCKET_NAME")
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"): missing_vars.append("GOOGLE_APPLICATION_CREDENTIALS")
    if not openai.api_key: missing_vars.append("OPENAI_API_KEY")
    # Add checks for other required variables (e.g., Tesseract path if needed)

    if missing_vars:
         print("ERROR: Missing required environment variables:")
         for var in missing_vars:
             print(f" - {var}")
         print("Please set these variables and restart the server.")
         # Optionally exit if critical variables are missing
         # exit(1)
    else:
        print("All required environment variables seem to be set.")

    print("Starting Flask server...")
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"- {rule.endpoint}: {rule.rule} ({', '.join(rule.methods)})")

    # Run the Flask app
    # Use debug=True only for development, set to False in production
    # host='0.0.0.0' makes it accessible on your network
    app.run(debug=True, host='0.0.0.0', port=5000)
