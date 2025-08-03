import sqlite3
from flask import Blueprint, jsonify, g
import os

# Define the Blueprint for library routes
library_bp = Blueprint('library_bp', __name__)

# --- Database Connection Handling ---

# Construct an absolute path to the database file
# This assumes 'library_routes.py' is in the 'backend' folder.
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'equipment_library.db')

def get_db():
    """Opens a new database connection if there is none for the current request context."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        # This is key to getting dictionary-like results instead of tuples
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    """Closes the database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- API Routes ---

@library_bp.route('/equipment', methods=['GET'])
def get_equipment_list():
    """Fetches a list of all equipment (id and name)."""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, name FROM equipment ORDER BY name ASC")
        equipment = cursor.fetchall()
        # Convert the list of Row objects to a list of dictionaries
        equipment_list = [dict(row) for row in equipment]
        # The frontend expects the data under an "equipment" key
        return jsonify({"equipment": equipment_list})
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "A database error occurred."}), 500


@library_bp.route('/equipment/<int:equipment_id>', methods=['GET'])
def get_equipment_details(equipment_id):
    """Fetches all details for a single piece of equipment, including its ports."""
    try:
        db = get_db()
        
        # Fetch main equipment details
        equip_cursor = db.cursor()
        equip_cursor.execute("SELECT * FROM equipment WHERE id = ?", (equipment_id,))
        equipment_row = equip_cursor.fetchone()

        if equipment_row is None:
            return jsonify({"error": "Equipment not found"}), 404

        equipment_details = dict(equipment_row)

        # Fetch and attach associated ports
        port_cursor = db.cursor()
        port_cursor.execute("SELECT * FROM port WHERE equipment_id = ? ORDER BY label ASC", (equipment_id,))
        port_rows = port_cursor.fetchall()
        equipment_details['ports'] = [dict(row) for row in port_rows]

        return jsonify(equipment_details)
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "A database error occurred."}), 500

