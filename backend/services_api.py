from dotenv import load_dotenv
load_dotenv()   # <-- this reads .env into os.environ
from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# register o4-mini analysis route
from services.o4_analyze import analyze_diagram
@app.route("/analyze", methods=["POST"])
def analyze_route():
    try:
        return analyze_diagram(request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        from flask import jsonify
        return jsonify({"error": str(e), "trace": traceback.format_exc().splitlines()}), 500

if __name__ == "__main__":
    print("Available routes:")
    print(app.url_map)
    app.run(debug=True)
