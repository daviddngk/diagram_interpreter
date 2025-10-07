import React from 'react';
import AnalysisToolCard from './AnalysisToolCard';

const BoundingBoxToolCard = ({ imageUrl, onDraw, reorderControls }) => {
  const handleRun = () => {
    if (!imageUrl) {
      alert('Please upload an image first.');
      return;
    }
    onDraw();
  };

  return (
    <AnalysisToolCard
      toolId="bounding-box-manual"
      title="Bounding Box (Manual)"
      description="Manually draw bounding boxes around components to identify them as nodes."
      onRun={handleRun}
      runButtonText="Draw Boxes"
      isLoading={false}
      isRunDisabled={!imageUrl}
      showCaptureButton={false}
      reorderControls={reorderControls}
    />
  );
};

export default BoundingBoxToolCard;
