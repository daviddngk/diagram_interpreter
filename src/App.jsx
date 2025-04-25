import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setResult(null);
  };

  const analyzeDiagram = async () => {
    if (!imageSrc) return;
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/analyze",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(res.data);
    } catch (err) {
      console.error("Analysis error:", err);
      alert("Failed to analyze diagram. Please check the server logs.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Diagram Interpreter</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      {imageSrc && (
        <div className="mb-4">
          <img src={imageSrc} alt="Preview" className="border p-2 max-h-96" />
        </div>
      )}

      {imageSrc && (
        <button
          onClick={analyzeDiagram}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Analyze Diagram
        </button>
      )}

      {result && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Analysis Result</h2>
          <pre className="overflow-x-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
