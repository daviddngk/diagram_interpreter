from flask import request, jsonify
from PIL import Image
from services.ocr_engine import extract_text_blocks

def register_ocr_routes(app):
    @app.route("/ocr", methods=["POST"])
    def ocr():
        print("OCR endpoint hit")
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image = Image.open(request.files["image"].stream).convert("RGB")
        blocks = extract_text_blocks(image)
        return jsonify(blocks)

