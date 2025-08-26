import sqlite3
import os
import json
from flask import Blueprint, jsonify, g, request

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

# --- Helper Functions ---

def get_port_by_id(port_id):
    """Helper function to fetch a single port by its ID."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM port WHERE id = ?", (port_id,))
    port_row = cursor.fetchone()
    return dict(port_row) if port_row else None

# --- Equipment API Routes ---

@library_bp.route('/equipment', methods=['GET'])
def get_equipment_list():
    """Fetches a list of all equipment (id and name)."""
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, name FROM equipment ORDER BY name ASC")
        equipment = cursor.fetchall()
        equipment_list = [dict(row) for row in equipment]
        return jsonify({"equipment": equipment_list})
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "A database error occurred."}), 500

@library_bp.route('/equipment/<int:equipment_id>', methods=['GET'])
def get_equipment_details(equipment_id):
    """Fetches all details for a single piece of equipment, including its ports."""
    try:
        db = get_db()
        equip_cursor = db.cursor()
        equip_cursor.execute("SELECT * FROM equipment WHERE id = ?", (equipment_id,))
        equipment_row = equip_cursor.fetchone()

        if equipment_row is None:
            return jsonify({"error": "Equipment not found"}), 404

        equipment_details = dict(equipment_row)

        # --- NEW: Deserialize JSON field ---
        if equipment_details.get('port_map_bounding_box'):
            try:
                equipment_details['port_map_bounding_box'] = json.loads(equipment_details['port_map_bounding_box'])
            except (json.JSONDecodeError, TypeError):
                print(f"Warning: Could not parse port_map_bounding_box for equipment {equipment_id}")
                equipment_details['port_map_bounding_box'] = None

        port_cursor = db.cursor()
        port_cursor.execute("SELECT * FROM port WHERE equipment_id = ? ORDER BY label ASC", (equipment_id,))
        port_rows = port_cursor.fetchall()
        equipment_details['ports'] = [dict(row) for row in port_rows]

        return jsonify(equipment_details)
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": "A database error occurred."}), 500

@library_bp.route('/equipment', methods=['POST'])
def create_equipment():
    """Creates a new equipment item."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"error": "Missing required field: name"}), 400

    sql = '''INSERT INTO equipment(name, description, front_panel_image, port_map_image)
             VALUES(?,?,?,?)'''
    params = (
        data.get('name'),
        data.get('description'),
        data.get('front_panel_image'),
        data.get('port_map_image')
    )
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(sql, params)
        db.commit()
        return jsonify({"message": "Equipment created successfully", "id": cursor.lastrowid}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": f"Equipment with name '{data.get('name')}' already exists."}), 409
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on create: {e}")
        return jsonify({"error": "A database error occurred during creation."}), 500

@library_bp.route('/equipment/<int:equipment_id>', methods=['PUT'])
def update_equipment(equipment_id):
    """Updates an existing equipment item."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    sql = '''UPDATE equipment SET name = ?, description = ?, front_panel_image = ?, port_map_image = ?
             WHERE id = ?'''
    params = (
        data.get('name'),
        data.get('description'),
        data.get('front_panel_image'),
        data.get('port_map_image'),
        equipment_id
    )
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(sql, params)
        db.commit()
        return jsonify({"message": f"Equipment {equipment_id} updated successfully."})
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on update: {e}")
        return jsonify({"error": "A database error occurred during update."}), 500

@library_bp.route('/equipment/<int:equipment_id>', methods=['DELETE'])
def delete_equipment(equipment_id):
    """Deletes an equipment item and its associated ports."""
    try:
        db = get_db()
        cursor = db.cursor()
        # First, delete associated ports to satisfy foreign key constraints
        cursor.execute("DELETE FROM port WHERE equipment_id = ?", (equipment_id,))
        # Then, delete the equipment item
        cursor.execute("DELETE FROM equipment WHERE id = ?", (equipment_id,))
        db.commit()
        return jsonify({"message": f"Equipment {equipment_id} deleted successfully."})
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on delete: {e}")
        return jsonify({"error": "A database error occurred during deletion."}), 500

@library_bp.route('/equipment/<int:equipment_id>/port-map', methods=['PUT'])
def update_port_map(equipment_id):
    """
    Updates the port map for a piece of equipment.
    This includes the equipment's reference bounding box and the relative
    coordinates for multiple ports in a single transaction.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    bounding_box = data.get('port_map_bounding_box')
    port_coords = data.get('port_coordinates')

    if bounding_box is None or port_coords is None:
        return jsonify({"error": "Missing 'port_map_bounding_box' or 'port_coordinates' in request."}), 400

    db = get_db()
    cursor = db.cursor()

    try:
        # 1. Update the equipment's bounding box
        bounding_box_str = json.dumps(bounding_box)
        cursor.execute(
            "UPDATE equipment SET port_map_bounding_box = ? WHERE id = ?",
            (bounding_box_str, equipment_id)
        )

        # 2. Update the coordinates for each port
        for port_id, coords in port_coords.items():
            cursor.execute(
                "UPDATE port SET coordinate_x = ?, coordinate_y = ? WHERE id = ?",
                (coords.get('x'), coords.get('y'), port_id)
            )

        db.commit()
        return jsonify({"message": f"Port map for equipment {equipment_id} updated successfully."})
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on port map update: {e}")
        return jsonify({"error": "A database error occurred during port map update."}), 500

# --- Port Specific CRUD Routes ---

@library_bp.route('/equipment/<int:equipment_id>/ports', methods=['POST'])
def add_port(equipment_id):
    """Adds a new port to a specific piece of equipment."""
    data = request.get_json()
    if not data or not data.get('label'):
        return jsonify({"error": "Missing required field: label"}), 400

    sql = '''INSERT INTO port(equipment_id, label, type, direction, rate)
             VALUES(?,?,?,?,?)'''
    params = (
        equipment_id,
        data.get('label'),
        data.get('type'),
        data.get('direction'),
        data.get('rate')
    )
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(sql, params)
        db.commit()
        new_port = get_port_by_id(cursor.lastrowid)
        return jsonify(new_port), 201
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on port create: {e}")
        return jsonify({"error": "Database error creating port."}), 500

@library_bp.route('/ports/<int:port_id>', methods=['PUT'])
def update_port(port_id):
    """Updates an existing port."""
    data = request.get_json()
    sql = '''UPDATE port SET label = ?, type = ?, direction = ?, rate = ?
             WHERE id = ?'''
    params = (data.get('label'), data.get('type'), data.get('direction'), data.get('rate'), port_id)
    try:
        db = get_db()
        db.execute(sql, params)
        db.commit()
        updated_port = get_port_by_id(port_id)
        return jsonify(updated_port)
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error on port update: {e}")
        return jsonify({"error": "Database error updating port."}), 500

@library_bp.route('/ports/<int:port_id>', methods=['DELETE'])
def delete_port(port_id):
    """Deletes a port."""
    try:
        db = get_db()
        db.execute("DELETE FROM port WHERE id = ?", (port_id,))
        db.commit()
        return jsonify({"message": f"Port {port_id} deleted successfully."})
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({"error": "Database error deleting port."}), 500
