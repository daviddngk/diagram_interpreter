import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [description, setDescription] = useState("");
  const [errorInfo, setErrorInfo] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setDescription("");
    setErrorInfo(null);
  };

  const analyzeDiagram = async () => {
    if (!imageSrc) return;
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await axios.post("http://localhost:5000/analyze", form);
      setDescription(res.data.description || "");
    } catch (err) {
      console.error("Analysis error:", err);
      if (err.response && err.response.data) {
        setErrorInfo(err.response.data);
      } else {
        setErrorInfo({ message: err.message });
      }
      setDescription("");
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
          Describe Diagram
        </button>
      )}

      {description && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Diagram Description</h2>
          <p className="whitespace-pre-wrap text-sm">
            {description}
          </p>
        </div>
      )}

      {errorInfo && (
        <div className="mt-6 bg-red-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2 text-red-700">Error</h2>
          <pre className="overflow-x-auto text-sm text-red-800">
            {JSON.stringify(errorInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
