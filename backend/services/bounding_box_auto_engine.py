import os
import re
import uuid
import difflib
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any, Optional

import cv2
import numpy as np
from PIL import Image

try:
    import easyocr  # type: ignore
except ImportError:  # pragma: no cover - fallback if easyocr not available
    easyocr = None

import pytesseract

TEMP_IMAGE_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp')
TEMP_IMAGE_BASE_URL = "http://localhost:5000/temp-images"

os.makedirs(TEMP_IMAGE_DIR, exist_ok=True)


@dataclass
class PipelineStep:
    name: str
    image: np.ndarray


class BoundingBoxPipelineError(Exception):
    """Raised when the auto bounding box pipeline fails."""


def _save_step_image(image: np.ndarray, step_name: str) -> str:
    """Persist a numpy image array and return a public URL."""
    filename = f"{uuid.uuid4()}_{step_name}.png"
    filepath = os.path.join(TEMP_IMAGE_DIR, filename)

    # Ensure the image is in BGR for OpenCV when saving
    if image.ndim == 2:
        save_image = image
    else:
        save_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    cv2.imwrite(filepath, save_image)
    return f"{TEMP_IMAGE_BASE_URL}/{filename}"


def _load_image(image_path: str) -> np.ndarray:
    if not os.path.exists(image_path):
        raise BoundingBoxPipelineError("Source image not found on server.")
    with Image.open(image_path) as img:
        return np.array(img.convert("RGB"))


def _extract_text_candidates(image: np.ndarray) -> List[Dict[str, Any]]:
    """Return OCR text candidates with bounding boxes and confidence."""
    candidates: List[Dict[str, Any]] = []

    def _add_candidate(text: str, x_min: int, y_min: int, x_max: int, y_max: int, confidence: float) -> None:
        text = text.strip()
        if not text:
            return
        bbox = {
            "x": int(x_min),
            "y": int(y_min),
            "width": int(max(1, x_max - x_min)),
            "height": int(max(1, y_max - y_min)),
        }
        center = (
            bbox["x"] + bbox["width"] / 2.0,
            bbox["y"] + bbox["height"] / 2.0,
        )
        candidates.append({
            "text": text,
            "bbox": bbox,
            "center": center,
            "confidence": float(confidence),
        })

    if easyocr is not None:
        reader = easyocr.Reader(["en"], gpu=False)
        results = reader.readtext(image, detail=1, paragraph=False)
        for bbox, text, confidence in results:
            xs, ys = zip(*bbox)
            x_min = int(max(0, np.floor(min(xs))))
            x_max = int(np.ceil(max(xs)))
            y_min = int(max(0, np.floor(min(ys))))
            y_max = int(np.ceil(max(ys)))
            _add_candidate(text, x_min, y_min, x_max, y_max, confidence if confidence is not None else 0.0)
        return candidates

    # Fallback to pytesseract if easyocr is unavailable
    data = pytesseract.image_to_data(Image.fromarray(image), output_type=pytesseract.Output.DICT)
    n_boxes = len(data["text"])
    for i in range(n_boxes):
        text = data["text"][i]
        conf_str = data["conf"][i]
        try:
            confidence = float(conf_str)
        except (TypeError, ValueError):
            confidence = 0.0
        if confidence < 50:
            continue
        x = int(data["left"][i])
        y = int(data["top"][i])
        w = int(data["width"][i])
        h = int(data["height"][i])
        _add_candidate(text, x, y, x + w, y + h, confidence)
    return candidates


def _normalize_nodes(nodes: Optional[Any]) -> List[Dict[str, Any]]:
    if not nodes:
        return []
    if isinstance(nodes, dict):
        if 'nodes' in nodes and isinstance(nodes['nodes'], list):
            return nodes['nodes']
        if 'equipment_nodes' in nodes and isinstance(nodes['equipment_nodes'], list):
            return nodes['equipment_nodes']
        return [nodes]
    if isinstance(nodes, list):
        return nodes
    return []


def _tokenize(text: str) -> List[str]:
    base_tokens = [token for token in re.split(r'[^a-z0-9]+', text.lower()) if token]
    if not base_tokens:
        return []

    enriched_tokens: List[str] = []
    for token in base_tokens:
        if token not in enriched_tokens:
            enriched_tokens.append(token)

        if any(ch.isalpha() for ch in token) and any(ch.isdigit() for ch in token):
            # Split mixed alphanumeric strings like "p101" into ["p", "101"]
            for sub_token in re.findall(r'[a-z]+|\d+', token):
                if sub_token and sub_token not in enriched_tokens:
                    enriched_tokens.append(sub_token)

    return enriched_tokens


def _text_similarity(label: str, candidate_text: str) -> float:
    if not label or not candidate_text:
        return 0.0
    label_tokens = _tokenize(label)
    candidate_tokens = _tokenize(candidate_text)
    if not label_tokens or not candidate_tokens:
        token_score = 0.0
    else:
        intersection = set(label_tokens) & set(candidate_tokens)
        token_score = len(intersection) / max(len(label_tokens), len(candidate_tokens)) if intersection else 0.0

    normalized_label = re.sub(r'[^a-z0-9]+', '', label.lower())
    normalized_candidate = re.sub(r'[^a-z0-9]+', '', candidate_text.lower())
    seq_score = difflib.SequenceMatcher(None, normalized_label, normalized_candidate).ratio() if normalized_label and normalized_candidate else 0.0

    return max(token_score, seq_score)


def run_bounding_box_pipeline(
    image_path: str,
    existing_nodes: Optional[Any] = None,
    equipment_library: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Run the automatic bounding box pipeline and return step imagery plus nodes."""
    original = _load_image(image_path)

    steps: List[Dict[str, str]] = []
    debug_messages: List[str] = []

    # Step 1: original image
    steps.append({
        "name": "Original",
        "image_url": _save_step_image(original, "original"),
    })

    # Step 2: extract OCR text candidates and prepare mask
    text_candidates = _extract_text_candidates(original)
    text_mask = np.zeros(original.shape[:2], dtype=np.uint8)
    text_overlay = cv2.cvtColor(original.copy(), cv2.COLOR_RGB2BGR)
    for candidate in text_candidates:
        bbox = candidate["bbox"]
        x_min, y_min = bbox["x"], bbox["y"]
        x_max = x_min + bbox["width"]
        y_max = y_min + bbox["height"]
        text_mask[y_min:y_max, x_min:x_max] = 255
        cv2.rectangle(
            text_overlay,
            (bbox["x"], bbox["y"]),
            (bbox["x"] + bbox["width"], bbox["y"] + bbox["height"]),
            (0, 0, 255),
            1,
        )
        cv2.putText(
            text_overlay,
            candidate["text"][:20],
            (bbox["x"], max(0, bbox["y"] - 4)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.35,
            (0, 0, 255),
            1,
            cv2.LINE_AA,
        )

    steps.append({
        "name": "OCR Text Candidates",
        "image_url": _save_step_image(cv2.cvtColor(text_overlay, cv2.COLOR_BGR2RGB), "ocr_candidates"),
    })

    source_nodes = _normalize_nodes(existing_nodes)
    text_match_threshold = 0.3
    available_text_candidates = list(text_candidates)
    node_match_results: List[Tuple[Dict[str, Any], Optional[Dict[str, Any]], float]] = []

    matched_overlay = cv2.cvtColor(original.copy(), cv2.COLOR_RGB2BGR)

    for node in source_nodes:
        label = node.get('label') or ''
        best_candidate: Optional[Dict[str, Any]] = None
        best_score = 0.0
        for candidate in available_text_candidates:
            candidate_text = candidate['text']
            score = _text_similarity(label, candidate_text)
            if label.lower() in candidate_text.lower() or candidate_text.lower() in label.lower():
                score = max(score, 0.6)
            if score > best_score:
                best_score = score
                best_candidate = candidate

        if best_candidate and best_score >= text_match_threshold:
            node_match_results.append((node, best_candidate, best_score))
            available_text_candidates.remove(best_candidate)
            best_candidate['_node_match'] = {
                "node_id": node.get('id'),
                "label": label,
                "score": best_score,
            }
        else:
            node_match_results.append((node, None, best_score))

    for node, candidate, _ in node_match_results:
        if not candidate:
            continue
        bbox = candidate["bbox"]
        cv2.rectangle(
            matched_overlay,
            (bbox["x"], bbox["y"]),
            (bbox["x"] + bbox["width"], bbox["y"] + bbox["height"]),
            (0, 255, 0),
            2,
        )
        overlay_label = (node.get('label') or candidate["text"])[:24]
        cv2.putText(
            matched_overlay,
            overlay_label,
            (bbox["x"], max(0, bbox["y"] - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 0),
            1,
            cv2.LINE_AA,
        )

    steps.append({
        "name": "OCR Node Labels",
        "image_url": _save_step_image(cv2.cvtColor(matched_overlay, cv2.COLOR_BGR2RGB), "ocr_node_labels"),
    })

    # Step 3: isolate pure white pixels
    white_mask = np.all(original == [255, 255, 255], axis=-1)
    bw_pixels = np.zeros_like(original)
    bw_pixels[white_mask] = 255
    steps.append({
        "name": "White-only Mask",
        "image_url": _save_step_image(bw_pixels, "white_mask"),
    })

    # Step 4: remove text regions using prepared mask
    textless = bw_pixels.copy()
    textless[text_mask == 255] = 255
    steps.append({
        "name": "Text Removed",
        "image_url": _save_step_image(textless, "text_removed"),
    })

    # Step 5: morphology to clean shapes
    binary = textless[:, :, 0]
    inverted = cv2.bitwise_not(binary)
    kernel = np.ones((3, 3), dtype=np.uint8)
    eroded = cv2.erode(inverted, kernel, iterations=1)
    dilated = cv2.dilate(eroded, kernel, iterations=1)
    cleaned = dilated
    steps.append({
        "name": "Morphology",
        "image_url": _save_step_image(cv2.cvtColor(cleaned, cv2.COLOR_GRAY2RGB), "morphology"),
    })

    # Step 6: find contours and compute bounding boxes
    contours, _ = cv2.findContours(cleaned.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes: List[Dict[str, int]] = []
    bbox_vis = cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w == 0 or h == 0:
            continue
        boxes.append({
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
        })
        cv2.rectangle(bbox_vis, (x, y), (x + w, y + h), (0, 255, 0), 1)

    steps.append({
        "name": "Bounding Boxes",
        "image_url": _save_step_image(cv2.cvtColor(bbox_vis, cv2.COLOR_BGR2RGB), "bounding_boxes"),
    })

    boxes.sort(key=lambda b: (b["y"], b["x"]))

    def _center(bbox: Dict[str, int]) -> Tuple[float, float]:
        return (bbox["x"] + bbox["width"] / 2.0, bbox["y"] + bbox["height"] / 2.0)

    remaining_existing = []

    debug_messages.append(
        f"Source nodes provided: {len(source_nodes)} | Equipment records: {len(equipment_library or [])} | OCR candidates: {len(text_candidates)}"
    )

    for node, candidate, best_score in node_match_results:
        label = node.get('label') or ''
        node_with_bbox = dict(node)
        if candidate:
            node_with_bbox['bbox'] = candidate['bbox']
            remaining_existing.append(node_with_bbox)
            debug_messages.append(
                f"Node '{label}' matched to OCR text '{candidate['text']}' (score={best_score:.2f})"
            )
        else:
            if 'bbox' not in node_with_bbox:
                node_with_bbox['bbox'] = None
            remaining_existing.append(node_with_bbox)
            debug_messages.append(
                f"Node '{label}' could not be aligned with OCR text (best_score={best_score:.2f})"
            )

    enriched_nodes = list(remaining_existing)
    remaining_existing = list(enriched_nodes)

    matched_nodes = []

    for idx, box in enumerate(boxes, start=1):
        label = f"Auto Node {idx}"
        matched_equipment = None

        if remaining_existing:
            bx, by = _center(box)

            def score(node: Dict[str, Any]) -> float:
                node_bbox = node.get('bbox') or {}
                nx = node_bbox.get('x')
                ny = node_bbox.get('y')
                nw = node_bbox.get('width')
                nh = node_bbox.get('height')
                if None in (nx, ny, nw, nh):
                    return float('inf')
                cx = nx + nw / 2.0
                cy = ny + nh / 2.0
                return (cx - bx) ** 2 + (cy - by) ** 2

            best_node = min(remaining_existing, key=score)

            node_bbox = best_node.get('bbox')
            if not node_bbox or any(node_bbox.get(key) is None for key in ('x', 'y', 'width', 'height')):
                label = best_node.get('label') or label
                matched_equipment = best_node.get('matchedEquipment')
                remaining_existing = [n for n in remaining_existing if n is not best_node]
                debug_messages.append(
                    f"Box {idx}: nearest node '{best_node.get('label')}' missing bbox data; assigning label fallback"
                )
            else:
                node_center = _center({
                    "x": node_bbox.get('x'),
                    "y": node_bbox.get('y'),
                    "width": node_bbox.get('width'),
                    "height": node_bbox.get('height'),
                })
                distance = ((bx - node_center[0]) ** 2 + (by - node_center[1]) ** 2) ** 0.5

                threshold = (box["width"] ** 2 + box["height"] ** 2) ** 0.5 * 0.75

                if distance <= threshold:
                    label = best_node.get('label') or label
                    matched_equipment = best_node.get('matchedEquipment')
                    remaining_existing = [n for n in remaining_existing if n is not best_node]
                    debug_messages.append(
                        f"Box {idx}: matched to existing node '{label}' (distance={distance:.1f}, threshold={threshold:.1f})"
                    )
                else:
                    label = best_node.get('label') or label
                    matched_equipment = best_node.get('matchedEquipment')
                    remaining_existing = [n for n in remaining_existing if n is not best_node]
                    debug_messages.append(
                        f"Box {idx}: nearest existing node '{best_node.get('label')}' too far (distance={distance:.1f}, threshold={threshold:.1f}); assigning fallback label"
                    )
        else:
            debug_messages.append(f"Box {idx}: no existing nodes available for matching")

        if matched_equipment is None:
            debug_messages.append(f"Box {idx}: equipment match not provided (label='{label}')")

        matched_nodes.append({
            "id": idx,
            "label": label,
            "bbox": {
                "x": box["x"],
                "y": box["y"],
                "width": box["width"],
                "height": box["height"],
            },
            "matchedEquipment": matched_equipment,
            "ports": [],
        })

    matched_count = sum(1 for node in matched_nodes if node.get('matchedEquipment'))
    nodes_with_bbox = sum(1 for node in enriched_nodes if isinstance(node.get('bbox'), dict))
    summary = {
        "detected_nodes": len(matched_nodes),
        "matched_equipment": matched_count,
        "source_nodes_used": len(source_nodes) - len(remaining_existing),
        "nodes_with_bbox": nodes_with_bbox,
    }

    debug_messages.append(
        f"Summary: {matched_count}/{len(matched_nodes)} nodes attached to equipment | "
        f"source nodes consumed: {summary['source_nodes_used']} | nodes with bbox: {nodes_with_bbox}"
    )

    return {
        "nodes": matched_nodes,
        "steps": steps,
        "summary": summary,
        "debug_messages": debug_messages,
    }
