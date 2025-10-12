import React, { useCallback, useMemo, useRef, useState } from 'react';
import AnalysisToolCard from './AnalysisToolCard';
import EdgeTraceModal from './EdgeTraceModal';

const initialModalState = {
  isOpen: false,
  mode: 'auto',
};

const EdgeTraceToolCard = ({
  imageFile,
  imageUrl,
  onCaptureData,
  currentConsolidatedData,
  reorderControls,
}) => {
  const [modalState, setModalState] = useState(initialModalState);

  const pendingResolveRef = useRef(null);
  const pendingRejectRef = useRef(null);

  const closeModal = useCallback(() => {
    setModalState({ ...initialModalState });
  }, []);

  const runTrace = useCallback((mode) => {
    if (!imageFile) {
      return Promise.reject(new Error('Please upload an image first.'));
    }

    setModalState({ isOpen: true, mode });

    return new Promise((resolve, reject) => {
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;
    });
  }, [imageFile]);

  const handleModalClose = useCallback(() => {
    closeModal();
    if (pendingRejectRef.current) {
      pendingRejectRef.current(new Error('Process cancelled.'));
    }
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
  }, [closeModal]);

  const handleModalResult = useCallback((result) => {
    if (pendingResolveRef.current) {
      pendingResolveRef.current(result);
    }
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
  }, []);

  const additionalRunActions = useMemo(() => ([
    {
      label: 'Run (debug)',
      onRun: () => runTrace('debug'),
      disabled: !imageFile,
    },
  ]), [imageFile, runTrace]);

  return (
    <>
      <AnalysisToolCard
        toolId="edge-trace"
        title="Edge Trace (CV)"
        description="Performs a multi-step computer vision process to trace edges and lines in the diagram. Shows real-time progress."
        onRun={() => runTrace('auto')}
        runButtonText="Run"
        isRunDisabled={!imageFile}
        currentConsolidatedData={currentConsolidatedData}
        onCaptureData={onCaptureData}
        captureKey="edge_trace_cv"
        captureTransform={(data) => data}
        additionalRunActions={additionalRunActions}
        reorderControls={reorderControls}
        imageUrl={imageUrl}
      />

      <EdgeTraceModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        imageFile={imageFile}
        imageUrl={imageUrl}
        onClose={handleModalClose}
        onResult={handleModalResult}
      />
    </>
  );
};

export default EdgeTraceToolCard;
