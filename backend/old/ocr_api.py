from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import pytesseract

app = Flask(__name__)
CORS(app)  # Optional but useful for React

@app.route("/ocr", methods=["POST"])
def ocr():
    print("OCR endpoint hit")  # Debug print
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = Image.open(request.files["image"].stream).convert("RGB")
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    blocks = {}
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        if not text or float(data["conf"][i]) < 50:
            continue
        block = data["block_num"][i]
        if block not in blocks:
            blocks[block] = []
        blocks[block].append({
            "text": text,
            "left": data["left"][i],
            "top": data["top"][i],
            "width": data["width"][i],
            "height": data["height"][i],
            "conf": data["conf"][i]
        })

    result = []
    for block_num, words in blocks.items():
        result.append({
            "block_num": block_num,
            "text": " ".join(w["text"] for w in sorted(words, key=lambda x: (x["top"], x["left"])))
        })

    return jsonify(result)

if __name__ == "__main__":
    print("Available routes:")
    print(app.url_map)
    app.run(debug=True)