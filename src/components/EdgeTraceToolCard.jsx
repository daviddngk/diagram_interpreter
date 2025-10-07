import React from 'react';
import AnalysisToolCard from './AnalysisToolCard';

const EdgeTraceToolCard = ({ imageFile, onRunTrace, reorderControls }) => {
  const handleRun = () => {
    if (!imageFile) {
      alert('Please upload an image first.');
      return;
    }
    onRunTrace();
  };

  return (
    <AnalysisToolCard
      toolId="edge-trace"
      title="Edge Trace (CV)"
      description="Performs a multi-step computer vision process to trace edges and lines in the diagram. Shows real-time progress."
      onRun={handleRun}
      runButtonText="Run Trace"
      isLoading={false} // The loading state will be managed inside the modal
      isRunDisabled={!imageFile}
      showCaptureButton={false} // Capture is handled by the modal
      reorderControls={reorderControls}
    />
  );
};

export default EdgeTraceToolCard;
