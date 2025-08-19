# backend/services_api.py
import os
import datetime
import uuid
from dotenv import load_dotenv 
from flask import request, jsonify, Response, Blueprint, current_app, send_from_directory
from google.cloud import storage
import requests # To fetch image from URL
from PIL import Image # To open image for OCR/YOLO
import io # To handle image bytes
import openai # For analyze_diagram_from_url
import traceback # For detailed error logging
import json # For potentially parsing LLM response if needed

# Import your service functions
from services.ocr_engine import extract_text_blocks
from services.edge_detector_fewshot_llm import detect_edges_fewshot 
from services.diagram_classifier_engine import classify_diagram_from_url
from services.edge_trace_engine import execute_next_step
from services.port_matcher_llm import match_ports_llm
# ----------------------------------------

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

# --- Create a Blueprint ---
# This will hold all the service-related routes.
services_bp = Blueprint('services_bp', __name__)

# --- Constants for Temp Directory ---
# This path needs to be accessible from where the app is run.
# Assuming services_api.py is in backend/, this points to backend/temp/
TEMP_IMAGE_DIR = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(TEMP_IMAGE_DIR, exist_ok=True)
# ---

# --- In-memory store for streaming jobs ---
# NOTE: In a production environment with multiple workers, this should be
# replaced with a shared store like Redis or a database.
TRACE_JOBS = {}
# ----------------------------------------

# --- Route: Generate GCS Signed URL ---
@services_bp.route("/generate-upload-url", methods=["POST"])
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

# --- Route: Analyze Diagram (Original OpenAI Description) --- (not used right now)
@services_bp.route("/analyze", methods=["POST"])
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
@services_bp.route('/analyze/ocr', methods=['POST'])
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
@services_bp.route('/analyze/nodes', methods=['POST'])
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
                #{"type": "text", "text": "Identify the equipment nodes in the diagram at this URL and provide the output in the specified JSON format:"},
                {"type": "text", "text": "The diagram is provided via a url. Identify the equipment nodes in the diagram. Provide the output in the specified JSON format:"},
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

# --- New Route to Serve Temporary Images ---
@services_bp.route('/temp-images/<path:filename>')
def serve_temp_image(filename):
    """
    Serves the intermediate images generated by the Edge Trace tool.
    """
    # Security: Ensure the path is safe and within the intended directory.
    # send_from_directory handles this securely.
    return send_from_directory(TEMP_IMAGE_DIR, filename)

# --- Routes for Edge Trace Analysis (using Computer Vision) ---

@services_bp.route('/tools/edge-trace/initiate', methods=['POST'])
def initiate_edge_trace():
    """
    Step 1: Receives an image file, saves it locally, and returns a job ID.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided in the request."}), 400

    image_file = request.files['image']
    job_id = str(uuid.uuid4())

    # Save the uploaded file to the temp directory to be used by the engine.
    # Using a UUID-based name prevents filename conflicts.
    filename = f"{job_id}_original.png"
    original_filepath = os.path.join(TEMP_IMAGE_DIR, filename)
    image_file.save(original_filepath)

    TRACE_JOBS[job_id] = {
        "original_image_path": original_filepath, # Store the local path
        "step": 0,
        "intermediate_data_path": None
    }

    return jsonify({"job_id": job_id})

@services_bp.route('/tools/edge-trace/execute-step/<job_id>', methods=['POST'])
def execute_edge_trace_step(job_id):
    """
    Executes the next step of an edge trace job and returns the result.
    This is called sequentially by the client for manual stepping.
    """
    job_info = TRACE_JOBS.get(job_id)
    if not job_info:
        return jsonify({"error": "Invalid or expired job ID"}), 404

    try:
        response_data, updated_job_info = execute_next_step(job_info)
        TRACE_JOBS[job_id] = updated_job_info # Update the job state in our store

        return jsonify(response_data)

    except (FileNotFoundError, ConnectionError, ValueError) as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during step execution."}), 500

# --- Route: Edge Detection Analysis (using LLM) ---
@services_bp.route('/analyze/edges', methods=['POST'])
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

# --- Route: Edge Detection Analysis (Few Shot LLM) ---
@services_bp.route('/analyze/edges-fewshot', methods=['POST'])
def handle_edge_detection_fewshot_llm():
    # --- Pre-checks (API Key, Reference Content Loading) ---
    if not openai.api_key:
         return jsonify({"error": "OpenAI API key not configured on server."}), 500
    
    reference_markdown_content = current_app.config.get('REFERENCE_MARKDOWN_CONTENT')


    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body"}), 400

    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body"}), 400

    try:
        # ** TOKEN MANAGEMENT - CRITICAL **
        # Simple Truncation: Limit the reference text length.
        # This is a basic approach; more sophisticated methods (chunking, RAG) are better for large docs.
        # Adjust MAX_REF_LENGTH based on model limits and typical prompt size.
        MAX_REF_LENGTH = 16000 # Example: Limit reference text to ~16k characters
        truncated_reference = (reference_markdown_content[:MAX_REF_LENGTH] + '...') if len(reference_markdown_content) > MAX_REF_LENGTH else reference_markdown_content
        if not truncated_reference and REFERENCE_MARKDOWN_CONTENT is not None: # Check if truncation resulted in empty but original wasn't None
            print("Warning: No reference content available for few-shot prompt after potential truncation.")

        # --- Call the dedicated service function ---
        edge_results = detect_edges_fewshot(image_url, truncated_reference)

        # The service function now returns parsed JSON or raises an exception
        # If it returned an error dict, handle it (optional, depends on service design)
        # if "error" in edge_results:
        #    return jsonify(edge_results), 500 # Or appropriate status code

        return jsonify(edge_results)

    # --- Error Handling for Exceptions Raised by the Service ---
    except json.JSONDecodeError as json_err:
        # This might happen if the service tries to parse invalid JSON from LLM
        print(f"Error decoding JSON returned by LLM (via service): {json_err}")
        # Potentially log the raw response if the service could provide it
        return jsonify({"error": "LLM did not return valid JSON for few-shot edge detection."}), 500
    except openai.BadRequestError as e:
        print(f"OpenAI API BadRequestError during Few-Shot Edge Detection: {e}")
        # Add specific checks for token limits if possible from error message
        if "context_length_exceeded" in str(e):
             error_message = "The request failed because the combined diagram analysis prompt and reference material exceeded the model's token limit. Try reducing the reference material size."
        else:
            error_message = f"Could not perform few-shot edge detection via OpenAI. The API reported an error: {e}"
            if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
                 error_message = f"Could not perform few-shot edge detection. The model failed to access an image URL. Ensure all URLs (diagram and reference images) are valid and accessible."
        return jsonify({"error": error_message}), 400
    except Exception as e:
        # Catch errors raised by the service function or other unexpected issues
        print(f"An unexpected error occurred during LLM Few-Shot Edge Detection: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during Few-Shot Edge Detection analysis."}), 500

# --- Route: Port Matching (LLM) ---
@services_bp.route('/analyze/port-match-llm', methods=['POST'])
def handle_port_match_llm():
    if not openai.api_key:
         return jsonify({"error": "OpenAI API key not configured on server."}), 500
    
    reference_markdown_content = current_app.config.get('REFERENCE_MARKDOWN_CONTENT', '')

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON request body"}), 400

    image_url = data.get('image_url')
    if not image_url:
        return jsonify({"error": "Missing 'image_url' in request body"}), 400

    # This tool requires context from the Edge Trace (CV) tool.
    diagram_iq = data.get('diagram_iq', {})
    edge_trace_output = diagram_iq.get('edge_trace_cv')

    if not edge_trace_output:
        return jsonify({"error": "Edge Trace (CV) data is required for this tool. Please run that step first."}), 400

    try:
        # Convert the edge trace python dict to a JSON string for the prompt
        edge_trace_context_str = json.dumps(edge_trace_output, indent=2)

        # Call the dedicated service function
        port_match_results = match_ports_llm(
            image_url=image_url, 
            reference_context=reference_markdown_content, 
            edge_trace_context=edge_trace_context_str
        )

        # The service function returns parsed JSON or an error dict.
        if "error" in port_match_results:
           return jsonify(port_match_results), 400

        return jsonify(port_match_results)

    except openai.BadRequestError as e:
        print(f"OpenAI API BadRequestError during Port Matching: {e}")
        error_message = f"Could not perform port matching. The model failed to access an image URL. Ensure all URLs are valid and accessible."
        return jsonify({"error": error_message}), 400
    except Exception as e:
        print(f"An unexpected error occurred during LLM Port Matching: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred during Port Matching analysis."}), 500

# --- Route: Diagram Classification ---
@services_bp.route('/analyze/classify', methods=['POST'])
def analyze_classify_diagram_style():
    """
    Endpoint to classify the diagram style using the LLM.
    Expects JSON: {"image_url": "GCS public URL of the image"}
    """
    try:
        data = request.get_json()
        if not data or 'image_url' not in data:
            current_app.logger.error("Missing image_url in /analyze/classify request")
            return jsonify({"error": "Missing image_url in request"}), 400

        image_url = data['image_url']
        current_app.logger.info(f"Received request for diagram style classification: {image_url}")

        # Call the classification engine function
        classification_result = classify_diagram_from_url(image_url)
        
        current_app.logger.info(f"Diagram style classification successful for: {image_url}. Result: {classification_result}")
        return jsonify(classification_result), 200

    except ValueError as ve: # Catch specific errors from the engine
        current_app.logger.error(f"Classification ValueError in /analyze/classify: {ve}")
        return jsonify({"error": str(ve)}), 400 # Or 500 if it's an unexpected config issue
    except Exception as e:
        current_app.logger.error(f"Error during diagram style classification in /analyze/classify: {e}")
        traceback.print_exc() 
        return jsonify({"error": "An unexpected error occurred during classification."}), 500
