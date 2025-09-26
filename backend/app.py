import os
from flask import Flask
from flask_cors import CORS
import openai
from dotenv import load_dotenv
from google.cloud import storage

# Import blueprints and db closer from your route files
from library_routes import library_bp, close_db
from services_api import services_bp

load_dotenv()

def load_reference_material(app):
    """Loads the reference markdown file into the app's config."""
    reference_file_path = os.path.join(os.path.dirname(__file__), 'reference_material', 'site_reference.md')
    try:
        if os.path.exists(reference_file_path):
            with open(reference_file_path, 'r', encoding='utf-8') as f:
                app.config['REFERENCE_MARKDOWN_CONTENT'] = f.read()
            print(f"Successfully loaded reference material from: {reference_file_path}")
        else:
            print(f"Warning: Reference material file not found at {reference_file_path}. Few-shot endpoint will lack context.")
            app.config['REFERENCE_MARKDOWN_CONTENT'] = "" # Set to empty string if not found
    except Exception as e:
        print(f"Error loading reference material: {e}")
        app.config['REFERENCE_MARKDOWN_CONTENT'] = "" # Set to empty string on error

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)

    # --- Robust CORS Configuration ---
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True
    )

    # --- JSON Configuration ---
    app.json.sort_keys = False # Preserve key order in JSON responses

    # Load reference material into app config
    load_reference_material(app)

    # --- GCS Configuration ---
    app.config['GCS_BUCKET_NAME'] = os.getenv("GCS_BUCKET_NAME")
    app.config['GCS_CLIENT'] = None
    try:
        if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            print("Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable not set. GCS features disabled.")
        elif not app.config['GCS_BUCKET_NAME']:
            print("Warning: GCS_BUCKET_NAME environment variable not set. GCS features disabled.")
        else:
            storage_client = storage.Client()
            # Test connection by trying to get the bucket
            storage_client.bucket(app.config['GCS_BUCKET_NAME'])
            app.config['GCS_CLIENT'] = storage_client
            print(f"GCS Client initialized and connected to bucket: {app.config['GCS_BUCKET_NAME']}")
    except Exception as e:
        print(f"Error initializing Google Cloud Storage client: {e}. GCS features disabled.")
        app.config['GCS_CLIENT'] = None

    # --- OpenAI Configuration ---
    # Load API key during initialization
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if not openai.api_key:
        print("Warning: OPENAI_API_KEY environment variable not set. OpenAI features disabled.")

    # Register your API blueprints
    app.register_blueprint(library_bp, url_prefix='/library')
    app.register_blueprint(services_bp, url_prefix='/') # Register the new services blueprint

    # Ensure the database connection is closed after each request
    app.teardown_appcontext(close_db)

    return app

if __name__ == '__main__':
    app = create_app()
    print("Starting Flask server...")
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"- {rule.endpoint}: {rule.rule} ({', '.join(rule.methods)})")

    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)