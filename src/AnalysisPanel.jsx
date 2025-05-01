import React from 'react';
import AnalysisToolCard from './AnalysisToolCard';

export default function AnalysisPanel({ imageUrl }) {
  // Define the tools you want to display
  const tools = [
    { title: 'OCR Results', toolId: 'ocr' },
    { title: 'Node Detection (LLM)', toolId: 'nodes' },
    { title: 'Edge Detection (LLM)', toolId: 'edges' }
    // Add more tools here as needed
    // { title: 'Relationship Analysis', toolId: 'relationships' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 bg-gray-50 border-l border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Analysis Tools</h2>
      {!imageUrl && <p className="text-sm text-gray-500 italic mb-4">Upload an image to enable analysis tools.</p>}
      {tools.map((tool) => (
        <AnalysisToolCard key={tool.toolId} title={tool.title} toolId={tool.toolId} imageUrl={imageUrl} />
      ))}
    </div>
  );
}