import time
import json
import uuid
import os
import requests
import cv2
import numpy as np
from skimage.morphology import skeletonize
import networkx as nx

# --- Constants and Setup ---
# Define a temporary directory to store intermediate images.
# This will be created in the `backend` root directory.
TEMP_IMAGE_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp')
os.makedirs(TEMP_IMAGE_DIR, exist_ok=True)

# The base URL for accessing these temp images from the frontend.
# This must match the route defined in services_api.py
TEMP_IMAGE_BASE_URL = "http://localhost:5000/temp-images"
# ---

# --- Modular CV Processing Functions ---

def _save_intermediate_image(image_data, step_name: str):
    """Saves a numpy image array to the temp directory and returns its public URL."""
    filename = f"{uuid.uuid4()}_{step_name}.png"
    filepath = os.path.join(TEMP_IMAGE_DIR, filename)
    
    cv2.imwrite(filepath, image_data)
    
    # Construct the URL the frontend will use to fetch this image.
    public_url = f"{TEMP_IMAGE_BASE_URL}/{filename}"
    return public_url

def _process_step_1_blue_mask(bgr_image):
    """Creates a binary mask to isolate blue elements by converting to HSV color space from BGR."""
    # Convert the image from BGR to HSV (Hue, Saturation, Value) color space, as per the notebook.
    hsv_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)

    # Define the range for blue color in HSV, exactly as in the notebook.
    lower_blue = np.array([95, 60, 40])
    upper_blue = np.array([135, 255, 255])

    # Create a binary mask. Pixels within the bounds are white (255), others are black (0).
    mask = cv2.inRange(hsv_image, lower_blue, upper_blue)
    image_url = _save_intermediate_image(mask, "blue_mask")
    output_text = "Converted BGR to HSV and created a binary mask to isolate blue elements."
    return image_url, output_text, mask

def _process_step_2_contour_outline(blue_mask):
    """
    Finds contours, filters them by area, and redraws them as outlines
    to clean up the mask.
    """
    # Find all contours in the initial mask.
    # A copy is used as findContours can modify the source image.
    contours, _ = cv2.findContours(
        blue_mask.copy(),
        cv2.RETR_LIST,  # RETR_LIST keeps nested contours so interior traces aren't dropped
        cv2.CHAIN_APPROX_SIMPLE,
    )

    # Prepare a new black mask to hold the cleaned-up result.
    clean_mask = np.zeros_like(blue_mask)

    # Define parameters for filtering and drawing.
    min_contour_area = 200
    outline_thickness = 2
    kept_contours = []

    # Loop through all found contours and filter by area.
    for contour in contours:
        if cv2.contourArea(contour) > min_contour_area:
            kept_contours.append(contour)

    # Draw the kept contours as outlines on the new mask.
    cv2.drawContours(clean_mask, kept_contours, -1, (255), thickness=outline_thickness)

    # Save the result and create descriptive output text.
    image_url = _save_intermediate_image(clean_mask, "contour_outline")
    output_text = f"Found {len(contours)} contours, kept {len(kept_contours)} by filtering small areas. Redrew as outlines."
    
    return image_url, output_text, clean_mask

def _process_step_3_skeletonize(clean_mask):
    """
    Reduces the cleaned mask to a single-pixel-wide skeleton using scikit-image.
    """
    # The input mask is 0 or 255. Convert to boolean (True/False).
    boolean_mask = clean_mask > 0
    skeleton_bool = skeletonize(boolean_mask)

    # Convert the boolean skeleton back to a uint8 image (0 and 255) for saving and display.
    skeleton_mask = (skeleton_bool.astype(np.uint8) * 255)

    image_url = _save_intermediate_image(skeleton_mask, "skeleton")
    output_text = "Reduced outlines to a single-pixel-wide skeleton for precise line detection."
    return image_url, output_text, skeleton_mask

def _process_step_4_find_endpoints_and_crossings(skeleton_mask):
    """
    Builds a graph from the skeleton, finds endpoints and crossings,
    and visualizes them.
    """
    # --- 1. Build graph from skeleton mask ---
    G = nx.Graph()
    rows, cols = skeleton_mask.shape
    # Iterate over each pixel to build the graph
    for y in range(rows):
        for x in range(cols):
            if skeleton_mask[y, x]: # If the pixel is part of the skeleton
                # Check neighbors
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        if dx == 0 and dy == 0:
                            continue
                        ny, nx_ = y + dy, x + dx
                        # Check bounds and if neighbor is part of skeleton
                        if 0 <= ny < rows and 0 <= nx_ < cols and skeleton_mask[ny, nx_]:
                            G.add_edge((y, x), (ny, nx_))

    # --- 2. Derive endpoints and crossings from node degrees ---
    endpoints = [node for node, deg in G.degree() if deg == 1]
    crossings = [node for node, deg in G.degree() if deg > 2]

    # --- 3. Create visualization ---
    # Convert skeleton to a color image to draw colored markers
    viz_image = cv2.cvtColor(skeleton_mask, cv2.COLOR_GRAY2BGR)
    # Draw endpoints as green circles
    for (y, x) in endpoints:
        cv2.circle(viz_image, (x, y), 5, (0, 255, 0), 1) # Green, 5px radius, 1px thick
    # Draw crossings as red 'X's
    for (y, x) in crossings:
        cv2.drawMarker(viz_image, (x, y), (0, 0, 255), cv2.MARKER_TILTED_CROSS, 10, 2) # Red, 10px size, 2px thick

    image_url = _save_intermediate_image(viz_image, "endpoints_crossings")
    output_text = f"Graph built. Found {len(endpoints)} endpoints (green) and {len(crossings)} crossings (red)."
    
    # Return the visualized image, but pass the graph and skeleton to the next step
    # We package them in a dictionary for clarity.
    step_data = {"skeleton_mask": skeleton_mask, "graph": G}
    return image_url, output_text, step_data

# --- Helper functions for Step 5 ---

def _unit_vec(a, b):
    ay, ax = a; by, bx = b
    v = np.array([by - ay, bx - ax], dtype=float)
    n = np.linalg.norm(v)
    return v / n if n else v


def _walk_connection_path(start_pt, skeleton_mask, pixel_degree, visited, radius=10):
    path = [start_pt]
    current = start_pt
    prev = None

    while True:
        visited.add(current)
        deg = pixel_degree.get(current, 0)
        # print(f"  At {current}, degree = {deg}")

        # --- First step from endpoint (deg=1) ---
        if deg == 1 and prev is None:
            nbrs = []
            for dy in [-1, 0, 1]:
                for dx in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue
                    ny, nx = current[0] + dy, current[1] + dx
                    if 0 <= ny < skeleton_mask.shape[0] and 0 <= nx < skeleton_mask.shape[1]:
                        nbr = (ny, nx)
                        if skeleton_mask[ny, nx] and nbr not in visited:
                            nbrs.append(nbr)

            if len(nbrs) == 1:
                prev = current
                current = nbrs[0]
                path.append(current)
                continue
            elif len(nbrs) > 1:
                print(f"  [Error] Multiple neighbors at start: {current}")
                break
            else:
                print(f"  [Abort] No neighbors from start point: {current}")
                break

        # --- Arrived at another endpoint ---
        elif deg == 1 and current != start_pt:
            return path  # success

        # --- Degree 2 (normally straight line) ---
        elif deg == 2:
            nbrs = []
            for dy in [-1, 0, 1]:
                for dx in [-1, 0, 1]:
                    if dx == 0 and dy == 0:
                        continue
                    ny, nx = current[0] + dy, current[1] + dx
                    if 0 <= ny < skeleton_mask.shape[0] and 0 <= nx < skeleton_mask.shape[1]:
                        nbr = (ny, nx)
                        if skeleton_mask[ny, nx] and nbr not in visited:
                            nbrs.append(nbr)

            if not nbrs:
                print(f"  [Abort] No unvisited neighbors at {current}")
                break
            elif len(nbrs) == 1:
                next_pt = nbrs[0]
            else:
                # Use direction to resolve ambiguity
                if len(path) >= 6:
                    in_vec = _unit_vec(path[-6], path[-1])
                else:
                    in_vec = _unit_vec(prev, current)

                def alignment(p):
                    return np.dot(in_vec, _unit_vec(current, p))

                nbrs.sort(key=alignment, reverse=True)
                next_pt = nbrs[0]

            prev = current
            current = next_pt
            path.append(current)
            continue

        # --- Degree >2: Junction jump ---
        elif deg > 2:
            if prev is None:
                print(f"  [Abort] No approach vector at junction start {current}")
                break

            cy, cx = current
            candidates = []
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    ny, nx = cy + dy, cx + dx
                    pt = (ny, nx)
                    if pt == current or not (0 <= ny < skeleton_mask.shape[0] and 0 <= nx < skeleton_mask.shape[1]):
                        continue
                    if skeleton_mask[ny, nx] and pt not in visited:
                        candidates.append(pt)

            if not candidates:
                print(f"  [Abort] No jump candidates found at {current}")
                break

            if len(path) >= 6:
                in_vec = _unit_vec(path[-radius], path[-1])
            else:
                in_vec = _unit_vec(prev, current)

            def alignment(p):
                return np.dot(in_vec, _unit_vec(prev, p))

            candidates.sort(key=alignment, reverse=True)
            next_pt = candidates[0]

            prev = current
            current = next_pt
            path.append(current)
            continue

        # --- Unexpected case ---
        else:
            print(f"  [Abort] Unexpected degree={deg} at {current}")
            break

    return None  # failed

# ********************************************************************************************

def _process_step_5_generate_output(step_data):
    """
    Walks all paths from endpoints to generate the final JSON output.
    """
    skeleton_mask = step_data["skeleton_mask"]
    G = step_data["graph"]

    # Create the pixel_degree dictionary required by the new walker
    pixel_degree = dict(G.degree())
    endpoints = [node for node, deg in G.degree() if deg == 1]

    connection_records = []
    visited_nodes = set()

    for start_node in endpoints:
        # If we have already processed this endpoint as part of a previous path, skip it.
        if start_node in visited_nodes:
            continue

        # The walker uses the visited_nodes set to avoid crossing old paths.
        # Call the new walker with the correct arguments
        path = _walk_connection_path(start_node, skeleton_mask, pixel_degree, visited_nodes)

        if path and len(path) > 1:
            end_node = path[-1]
            # Record the simplified connection data as requested.
            connection_records.append({
                "id": len(connection_records) + 1,
                "start_node": start_node,
                "end_node": end_node
            })
            # IMPORTANT: Mark all nodes in the found path as visited.
            # This prevents us from starting a new walk from the other end of this same path.
            visited_nodes.update(path)

    # For the final step, there's no new image to show, but we create the JSON.
    # We can reuse the visualization from the previous step.
    image_url = _save_intermediate_image(cv2.cvtColor(skeleton_mask, cv2.COLOR_GRAY2BGR), "final_viz")
    output_text = f"Path walking complete. Found {len(connection_records)} distinct connections."
    
    return image_url, output_text, {"connections": connection_records}

# --- New Main Function for single-step execution ---

# Define the sequence of processing steps in a more accessible way
PROCESS_STEPS = [
    {"name": "Step 1: Create Blue Color Mask", "function": _process_step_1_blue_mask},
    {"name": "Step 2: Contour Outline & Cleanup", "function": _process_step_2_contour_outline},
    {"name": "Step 3: Skeletonize Mask", "function": _process_step_3_skeletonize},
    {"name": "Step 4: Find Endpoints & Crossings", "function": _process_step_4_find_endpoints_and_crossings},
    {"name": "Step 5: Generate Final Output", "function": _process_step_5_generate_output}
]

def execute_next_step(job_info: dict):
    """
    Executes a single step of the CV process based on the job's current state.
    """
    current_step_index = job_info.get('step', 0)

    if current_step_index >= len(PROCESS_STEPS):
        # All steps are complete
        final_summary = {
            "message": "Processing complete.",
            "final_json": job_info.get("final_json", {"error": "Final JSON not generated."}),
            "is_complete": True
        }
        return final_summary, job_info

    step_config = PROCESS_STEPS[current_step_index]

    # --- Load input image for the current step ---
    # Check if there's a special data structure passed from the previous step
    if 'step_artefact' in job_info and job_info['step_artefact'] is not None:
        input_data = job_info.pop('step_artefact') # Use it once and remove it
    elif current_step_index == 0:
        # First step: load the original image from the local path
        image_path = job_info.get('original_image_path')
        if not image_path or not os.path.exists(image_path):
             raise FileNotFoundError("Original image for job not found on server.")
        input_data = cv2.imread(image_path, cv2.IMREAD_COLOR)
    else:
        # Subsequent steps: load the intermediate image from the previous step
        previous_image_path = job_info.get('intermediate_data_path')
        if not previous_image_path or not os.path.exists(previous_image_path):
            raise FileNotFoundError("Intermediate image from previous step not found.")
        # Load as-is, could be color or grayscale
        input_data = cv2.imread(previous_image_path, cv2.IMREAD_UNCHANGED)
    
    # This check now covers both image arrays and other data types like dicts
    if input_data is None:
        raise ValueError("Failed to read image data from disk for the current step.")

    # --- Execute the step ---
    if step_config["function"]:
        step_image_url, step_output_text, result_data = step_config["function"](input_data)

        # Check if the result is the final JSON or an intermediate image
        if isinstance(result_data, dict) and "connections" in result_data:
            job_info['final_json'] = result_data
            job_info['intermediate_data_path'] = None # No more image processing
        # Check if the result is a dictionary to be passed to the next step
        elif isinstance(result_data, dict) and "graph" in result_data:
            job_info['step_artefact'] = result_data # Store for next step
            filename = os.path.basename(step_image_url)
            job_info['intermediate_data_path'] = os.path.join(TEMP_IMAGE_DIR, filename)
        else:
            # It's an intermediate image (numpy array)
            # The URL is for the frontend, we need the local path for the next step
            filename = os.path.basename(step_image_url)
            job_info['intermediate_data_path'] = os.path.join(TEMP_IMAGE_DIR, filename)
    else:
        # Handle placeholder steps
        step_image_url = step_config["image"]
        step_output_text = step_config["output_text"]
        job_info['intermediate_data_path'] = None # No real data for next step

    # --- Update job state for the next step ---
    job_info['step'] = current_step_index + 1

    # --- Prepare response for the frontend ---
    response_data = {
        "step": job_info['step'],
        "total_steps": len(PROCESS_STEPS),
        "status": step_config["name"],
        "output_text": step_output_text,
        "image_url": step_image_url,
        "is_complete": False
    }

    return response_data, job_info

# --- Main Streaming Function ---
