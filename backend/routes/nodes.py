from flask import request, jsonify
from PIL import Image
from services.node_detector_yolo import detect_equipment_nodes

def register_node_routes(app):
    @app.route("/nodes", methods=["POST"])
    def detect_nodes():
        print("Node detection (YOLOv8) endpoint hit")
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image = Image.open(request.files["image"].stream).convert("RGB")
        detections = detect_equipment_nodes(image)
        return jsonify(detections)
