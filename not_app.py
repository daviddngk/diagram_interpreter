from flask import Flask
from flask_cors import CORS

# Import the blueprint and db closer from your routes file
from library_routes import library_bp, close_db

# You will likely have other route files for analysis, import them here too
# from analysis_routes import analysis_bp

def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)

    # --- This is the key change for the Network Error ---
    # It explicitly allows requests from your React app's origin
    # and includes support for all necessary HTTP methods (GET, POST, PUT, DELETE)
    # and credentials.
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True
    )

    # Register your API blueprints
    app.register_blueprint(library_bp, url_prefix='/library')
    # app.register_blueprint(analysis_bp, url_prefix='/') # Example for analysis routes

    # Ensure the database connection is closed after each request
    app.teardown_appcontext(close_db)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)