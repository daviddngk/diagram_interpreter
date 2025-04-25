from ultralytics import YOLO
import numpy as np

# Load YOLOv8 model (nano, fast)
model = YOLO("yolov8n.pt")

def detect_equipment_nodes(image):
    # Convert PIL image to numpy array
    results = model(np.array(image))[0]

    detections = []
    for box in results.boxes:
        label = results.names[int(box.cls)]
        conf = float(box.conf.item())
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        detections.append({
            "label": label,
            "conf": conf,
            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
        })

    return detections
