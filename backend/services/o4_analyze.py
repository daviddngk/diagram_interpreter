# File: backend/services/o4_analyze.py
import os
import base64
import json
from flask import jsonify
import openai

# Initialize API key
openai.api_key = os.getenv("OPENAI_API_KEY")

def analyze_diagram(req):
    """
    Read an uploaded image from the Flask request, send it to o4-mini for
    node/edge extraction, and return a JSON response.
    """
    # 1. Get the image file
    image_file = req.files.get("image")
    if image_file is None:
        return jsonify({"error": "No image provided"}), 400
    img_bytes = image_file.read()

    # 2. Encode as Data URI with correct MIME type
    mime = image_file.mimetype  # e.g. "image/png" or "image/jpeg"
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    data_uri = f"data:{mime};base64,{b64}"

    # 3. Build prompt messages
    system_msg = {
        "role": "system",
        "content": (
            "You are a telecom diagram parser. "
            "Extract all equipment items as nodes and connections as edges."
        )
    }
    user_msg = {
        "role": "user",
        "content": (
            "Analyze this diagram image and return a JSON object with:\n"
            "- nodes: an array of { id, type, label, bbox }\n"
            "- edges: an array of { from, to, label }\n\n"
            + data_uri
        )
    }

    # 4. Call o4-mini using the updated OpenAI Python library interface
    resp = openai.chat.completions.create(
        model="o4-mini",
        messages=[system_msg, user_msg],
        temperature=1
    )

    # 5. Parse the response
    content = resp.choices[0].message.content
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return jsonify({
            "error": "Invalid JSON from model",
            "raw": content
        }), 500

    # 6. Return structured JSON
    return jsonify(parsed)
