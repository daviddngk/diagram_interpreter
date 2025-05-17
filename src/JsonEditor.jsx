import React, { useState, useEffect } from 'react';

export default function JsonEditor({ initialJsonObject, onSave, onCancel, toolTitle }) {
  const [jsonText, setJsonText] = useState('');
  const [hasError, setHasError] = useState(false);

  // When the editor opens or initialJsonObject changes, load the JSON as a string
  useEffect(() => {
    try {
      const formatted = JSON.stringify(initialJsonObject, null, 2);
      setJsonText(formatted);
      setHasError(false);
    } catch (err) {
      console.error("Failed to format initialJsonObject:", err);
      setJsonText('');
      setHasError(true);
    }
  }, [initialJsonObject]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setJsonText(newText);
    try {
      JSON.parse(newText);
      setHasError(false);
    } catch {
      setHasError(true);
    }
  };

  const handleInternalSave = () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      onSave(parsedJson);
    } catch (err) {
      alert("Cannot save — the JSON is invalid.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Editing: {toolTitle}</h3>
        <div className="flex justify-start space-x-2">
          <button
            onClick={handleInternalSave}
            disabled={hasError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        <textarea
          value={jsonText}
          onChange={handleChange}
          className="w-full h-full p-3 font-mono text-sm border border-gray-300 rounded resize-none bg-gray-50"
        />
        {hasError && <p className="text-red-600 mt-2 text-sm">Invalid JSON. Please correct before saving.</p>}
      </div>
    </div>
  );
}
