import React, { useState, useEffect } from 'react';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

export default function JsonEditor({ initialJsonObject, onSave, onCancel, toolTitle }) {
  // Use a key to force re-mount and reset of JSONInput when initialJsonObject changes.
  const [editorKey, setEditorKey] = useState(Date.now());

  // Initialize currentJson with a deep clone of initialJsonObject.
  const [currentJson, setCurrentJson] = useState(() => {
    try {
      // Ensure initialJsonObject is not undefined before stringifying
      if (typeof initialJsonObject === 'undefined') {
        console.warn("[JsonEditor] initialJsonObject is undefined during initial useState, initializing currentJson to {}");
        return {};
      }
      return JSON.parse(JSON.stringify(initialJsonObject));
    } catch (e) {
      console.error("Error cloning initialJsonObject for JsonEditor during initial useState:", e, "Initial object was:", initialJsonObject);
      return {}; // Fallback
    }
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // When the initialJsonObject prop changes, reset internal state with a new deep clone.
    try {
      if (typeof initialJsonObject === 'undefined') {
        console.warn("[JsonEditor] useEffect: initialJsonObject is undefined, resetting currentJson to {}");
        setCurrentJson({});
      } else {
        setCurrentJson(JSON.parse(JSON.stringify(initialJsonObject)));
      }
    } catch (e) {
      console.error("Error cloning initialJsonObject in useEffect for JsonEditor:", e, "Initial object was:", initialJsonObject);
      setCurrentJson({}); // Fallback
    }
    setEditorKey(Date.now()); // Reset editor view
    setHasError(false);
  }, [initialJsonObject]);

  const handleEditorChange = (data) => {
    // This is the simpler version before extensive debugging logs were added here.
    if (data.jsObject) {
      setCurrentJson(data.jsObject);
      setHasError(false);
    } else if (data.error) {
      setHasError(true);
    }
    // Note: If data.jsObject is null (e.g. user types "null"), it's valid JSON.
    // The original library might provide data.jsObject as null in such cases.
    // The above logic handles this correctly by setting currentJson.
  };

  const handleInternalSave = () => {
    if (!hasError) {
      // Pass a deep clone of the current internal state to the onSave callback.
      try {
        const clonedJsonToSave = JSON.parse(JSON.stringify(currentJson));
        onSave(clonedJsonToSave);
      } catch (e) {
        console.error("Error cloning currentJson on save:", e);
        alert("Error preparing data for save. Please check console.");
      }
    } else {
      alert("Cannot save, JSON has errors.");
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
        <JSONInput
          key={editorKey}
          placeholder={currentJson}
          json={JSON.stringify(currentJson, null, 2)}
          locale={locale}
          colors={{
            string: "#DAA520",
            number: "#1E90FF",
            colon: "#4A4A4A",
            keys: "#AC3B61",
          }}
          height="100%"
          width="100%"
          onChange={handleEditorChange}
          waitAfterKeyPress={1000} // Original debouncing value
          confirmGood={false}
          style={{
            body: { fontSize: '13px', fontFamily: 'monospace' },
            container: { border: '1px solid #ddd', borderRadius: '4px', height: '100%' },
          }}
        />
      </div>
    </div>
  );
}
