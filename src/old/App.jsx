import React, { useState } from "react";

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [extractedText, setExtractedText] = useState([]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);

    // Send image to backend for OCR
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:5000/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("OCR failed");

      const blocks = await response.json();
      const blockTexts = blocks.map((block) => block.text);
      setExtractedText(blockTexts);
    } catch (error) {
      console.error("Error during OCR:", error);
      setExtractedText(["[OCR error]"]);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Column: Upload + Preview */}
      <div className="w-1/3 p-4 border-r border-gray-300">
        <h2 className="text-lg font-bold mb-2">Upload Diagram</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4"
        />
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Uploaded Diagram"
            className="max-w-full max-h-[70vh] rounded shadow"
          />
        ) : (
          <div className="text-gray-500 italic">No diagram loaded yet</div>
        )}
      </div>

      {/* Middle Column: Extracted Text + Observations */}
      <div className="w-1/3 p-4 border-r border-gray-300 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Extracted Text</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm mb-4 text-gray-800">
          {extractedText.length > 0 ? (
            extractedText.map((line, idx) => <li key={idx}>{line}</li>)
          ) : (
            <li className="italic text-gray-500">No text extracted yet</li>
          )}
        </ul>

		<h2 className="text-lg font-bold mb-2">Detected Nodes</h2>
		  <ul className="pl-5 text-sm mb-4 text-gray-600 italic">
			<li>No nodes detected yet</li>
		  </ul>

		  <h2 className="text-lg font-bold mb-2">Detected Edges</h2>
		  <ul className="pl-5 text-sm text-gray-600 italic">
			<li>No edges detected yet</li>
		  </ul>
				
        <h2 className="text-lg font-bold mb-2">Observations</h2>
        <ul className="space-y-2 text-sm">
          <li>• Detected Node: CSR Router</li>
          <li>• Detected Node: Baseband BB1</li>
          <li>• Detected Edge: Fiber from CSR to BB1</li>
        </ul>
      </div>

      {/* Right Column: JSON Output */}
      <div className="w-1/3 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Diagram as JSON</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`{
  "nodes": [
    {"id": "csr1", "type": "router", "label": "CSR Router"},
    {"id": "bb1", "type": "baseband", "label": "Baseband BB1"}
  ],
  "edges": [
    {"from": "csr1", "to": "bb1", "type": "fiber"}
  ]
}`}
        </pre>
      </div>
    </div>
  );
}
