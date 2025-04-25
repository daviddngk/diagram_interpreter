import pytesseract

def extract_text_blocks(image):
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
            "text": " ".join(w["text"] for w in sorted(words, key=lambda x: (x["top"], x["left"]))),
            "words": words
        })

    return result
