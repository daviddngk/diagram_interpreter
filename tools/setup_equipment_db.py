import sqlite3
import re
from pathlib import Path

# Define paths
root = Path(__file__).resolve().parents[1]
db_path = root / "backend" / "data" / "equipment_library.db"
md_path = root / "site_reference.md"

# Ensure parent folder exists
db_path.parent.mkdir(parents=True, exist_ok=True)

# Load markdown content
with open(md_path, "r", encoding="utf-8") as f:
    content = f.read()

# Create or reset the database
if db_path.exists():
    db_path.unlink()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    front_panel_image TEXT,
    port_map_image TEXT
)
""")
cursor.execute("""
CREATE TABLE port (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    type TEXT,
    direction TEXT,
    spec TEXT,
    rate TEXT,
    location TEXT,
    x1 INTEGER,
    y1 INTEGER,
    x2 INTEGER,
    y2 INTEGER,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
)
""")
conn.commit()

# Regex patterns
equipment_pattern = re.compile(
    r"#(?P<name>[\\w\\s\\d\\-]+)\\n##Description\\n(?P<desc>.+?)\\n##Front Panel Image URL: (?P<fp>.+?)\\n##Port Map Image URL: (?P<pm>.+?)\\n##Port Definitions Table:\\n(?P<port_table>\\|.+?)\\n\\n",
    re.DOTALL
)

# Parse and insert data
for match in equipment_pattern.finditer(content):
    name = match.group("name").strip()
    desc = match.group("desc").strip()
    fp = match.group("fp").strip()
    pm = match.group("pm").strip()
    port_table = match.group("port_table").strip().split("\n")[2:]  # skip headers

    cursor.execute("""
        INSERT INTO equipment (name, description, front_panel_image, port_map_image)
        VALUES (?, ?, ?, ?)
    """, (name, desc, fp, pm))
    equipment_id = cursor.lastrowid

    for row in port_table:
        cells = [c.strip() for c in row.strip("|").split("|")]
        if len(cells) != 6:
            continue
        label, ptype, location, direction, spec, rate = cells
        cursor.execute("""
            INSERT INTO port (equipment_id, label, type, location, direction, spec, rate,
                              x1, y1, x2, y2)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)
        """, (equipment_id, label, ptype, location, direction, spec, rate))

conn.commit()
conn.close()
print(f"✅ Database created and populated at: {db_path}")
