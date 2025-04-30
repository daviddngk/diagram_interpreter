# backend/services_api.py
import os
import datetime
import uuid
from dotenv import load_dotenv
from flask import Flask, request, jsonify
# Import CORS specifically
from flask_cors import CORS
from google.cloud import storage

load_dotenv()

# --- GCS Configuration ---
# (Your existing GCS config code remains here)
# ...
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
try:
    # (Your existing GCS client initialization code remains here)
    # ...
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        print("Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
        storage_client = None
    elif not GCS_BUCKET_NAME:
        print("Warning: GCS_BUCKET_NAME environment variable not set.")
        storage_client = None
    else:
        storage_client = storage.Client()
        print(f"GCS Client initialized for bucket: {GCS_BUCKET_NAME}")
except Exception as e:
    print(f"Error initializing Google Cloud Storage client: {e}")
    storage_client = None
# ---------------------

app = Flask(__name__)

# --- Explicit CORS Configuration ---
# Allow requests specifically from your frontend development server origin
# for the routes that the frontend needs to call.
cors = CORS(app, resources={
    r"/generate-upload-url": {"origins": "http://localhost:3000"},
    r"/analyze": {"origins": "http://localhost:3000"}
})
# Note: For production, you would replace or add your deployed frontend URL.
# Example: {"origins": ["http://localhost:3000", "https://your-deployed-app.com"]}
# ---------------------------------


# Import the existing analysis function (we'll adapt how it's called)
# This import might need adjustment based on refactoring below
# from services.o4_analyze import analyze_diagram # Original import

# --- New Route: Generate GCS Signed URL ---
# (Your existing /generate-upload-url route code remains here)
@app.route("/generate-upload-url", methods=["POST"])
def generate_upload_url_route():
    # ... (existing code) ...
    if not storage_client:
        return jsonify({"error": "GCS client not initialized on server."}), 500
    try:
        data = request.get_json()
        if not data: return jsonify({"error": "Missing JSON request body"}), 400
        original_filename = data.get("filename")
        content_type = data.get("contentType")
        if not original_filename or not content_type: return jsonify({"error": "Missing 'filename' or 'contentType' in request"}), 400
        file_ext = os.path.splitext(original_filename)[1]
        unique_blob_name = f"{uuid.uuid4()}{file_ext}"
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(unique_blob_name)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=15),
            method="PUT",
            content_type=content_type,
        )
        public_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{unique_blob_name}"
        return jsonify({"signedUrl": signed_url,"publicUrl": public_url})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate signed URL: {str(e)}", "trace": traceback.format_exc().splitlines()}), 500


# --- Modified Analysis Route ---
# (Your existing /analyze route code remains here)
@app.route("/analyze", methods=["POST"])
def analyze_route():
    # ... (existing code using analyze_diagram_from_url) ...
    try:
        data = request.get_json()
        if not data or "image_url" not in data:
             return jsonify({"error": "Missing 'image_url' in JSON request body"}), 400
        image_url = data["image_url"]
        return analyze_diagram_from_url(image_url) # Pass URL directly
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "trace": traceback.format_exc().splitlines()}), 500


# --- Helper function (or modify o4_analyze.py) ---
# (Your existing analyze_diagram_from_url function remains here)
def analyze_diagram_from_url(image_url):
    # ... (existing code) ...
    import openai # Ensure openai is imported here if not global
    system_msg = {"role": "system","content": "You are a helpful assistant that describes diagrams."}
    user_msg = {"role": "user","content": [{"type": "text", "text": "Describe the diagram found at this URL:"},{"type": "image_url", "image_url": {"url": image_url}},]}
    try:
        if not openai.api_key:
             openai.api_key = os.getenv("OPENAI_API_KEY")
             if not openai.api_key: raise ValueError("OpenAI API key not configured.")
        resp = openai.chat.completions.create(model="gpt-4o-mini",messages=[system_msg, user_msg])
        description = resp.choices[0].message.content
        return jsonify({"description": description, "url": image_url})
    except openai.BadRequestError as e:
        print(f"OpenAI API Error: {e}")
        error_message = f"Could not analyze the image. The API reported an error: {e}"
        if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
             error_message = f"Could not analyze the image. The model failed to access the image at the provided GCS URL: {image_url}. Ensure the object exists and is publicly readable."
        return jsonify({"error": error_message}), 400
    except Exception as e:
        print(f"An unexpected error occurred during OpenAI call: {e}")
        return jsonify({"error": "An unexpected error occurred during analysis."}), 500


if __name__ == "__main__":
    # (Your existing __main__ block remains here)
    # ...
    if not GCS_BUCKET_NAME or not os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or not os.getenv("OPENAI_API_KEY"):
         print("ERROR: Missing required environment variables (GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS, OPENAI_API_KEY)")
    else:
        print("Starting Flask server...")
        print("Available routes:")
        print(app.url_map)
        app.run(debug=True, host='0.0.0.0', port=5000)

