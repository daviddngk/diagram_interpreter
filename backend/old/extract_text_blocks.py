import pytesseract
from PIL import Image
import json
import sys
import os

def extract_text_blocks(image_path):
    image = Image.open(image_path).convert("RGB")
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

    # Format blocks into readable structure
    result = []
    for block_num, words in blocks.items():
        block_text = " ".join(w["text"] for w in sorted(words, key=lambda x: (x["top"], x["left"])))
        result.append({
            "block_num": block_num,
            "text": block_text,
            "words": words
        })

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_text_blocks.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)

    blocks = extract_text_blocks(image_path)
    print(json.dumps(blocks, indent=2))
