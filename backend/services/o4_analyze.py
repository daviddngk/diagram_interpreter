# backend/services/o4_analyze.py
import os
from flask import jsonify, request
import openai

# Make sure your key is loaded before this (via dotenv or env var)
openai.api_key = os.getenv("OPENAI_API_KEY")

def analyze_diagram(req):
    # 1. Grab the uploaded file from the POST
    image_file = req.files.get("image")
    if not image_file:
        return jsonify({"error": "No image provided"}), 400

    # --- Important Check: Ensure the file is actually saved ---
    # The current code assumes the file exists at the URL *before* calling the API.
    # You need to make sure your Flask route *saves* the uploaded file
    # to the location accessible by https://dngk.ca/diags/ *before* this point.
    # If it's not saved yet, the URL will lead to a 404, and the model won't find it.
    # Example (you'll need to adapt path/permissions):
    # save_path = os.path.join("/path/to/your/web/server/diags", image_file.filename)
    # try:
    #     image_file.save(save_path)
    # except Exception as e:
    #     print(f"Error saving file: {e}") # Add proper logging
    #     return jsonify({"error": "Failed to save image for analysis"}), 500
    # ---------------------------------------------------------


    # 2. Use the filename to build your public URL
    filename = image_file.filename
    image_url = f"https://dngk.ca/diags/{filename}"

    # 3. Build your chat prompt (Corrected for Image Input)
    system_msg = {
        "role": "system",
        "content": "You are a helpful assistant that describes diagrams."
    }
    user_msg = {
        "role": "user",
        "content": [ # <-- Content is now a LIST
            {"type": "text", "text": "Describe the diagram at this URL:"},
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url, # <-- Pass the URL specifically for the image
                    # Optional: You can add "detail": "low" | "high" | "auto" here
                    # "detail": "auto" is the default
                },
            },
        ]
    }

    # 4. Call GPT-4o-Mini (now correctly using vision capability)
    try:
        resp = openai.chat.completions.create(
            model="gpt-4o-mini", # This model supports vision
            messages=[system_msg, user_msg],
            # Optional: Add max_tokens if needed
            # max_tokens=1000
        )

        # 5. Return what the model says
        description = resp.choices[0].message.content
        return jsonify({"description": description, "url": image_url})

    except openai.BadRequestError as e:
        # Handle potential errors like invalid URL, inaccessible image, etc.
        print(f"OpenAI API Error: {e}") # Add proper logging
        error_message = f"Could not analyze the image. The API reported an error: {e}"
        # Check if the error message indicates the image couldn't be accessed
        if "Could not retrieve image" in str(e) or "Failed to download image" in str(e):
             error_message = f"Could not analyze the image. The model failed to access the image at the provided URL: {image_url}. Please ensure the URL is correct and publicly accessible."

        return jsonify({"error": error_message}), 400
    except Exception as e:
        # Handle other potential exceptions
        print(f"An unexpected error occurred: {e}") # Add proper logging
        return jsonify({"error": "An unexpected error occurred during analysis."}), 500

