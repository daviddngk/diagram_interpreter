import React, { useCallback, useMemo, useRef, useState } from 'react';

import AnalysisToolCard from './AnalysisToolCard';
import BoundingBoxAutoModal from './BoundingBoxAutoModal';

const API_BASE_URL = 'http://localhost:5000';

const initialModalState = {
  isOpen: false,
  status: 'idle',
  mode: 'auto',
  steps: [],
  error: null,
};

export default function BoundingBoxAutoToolCard({
  imageFile,
  imageUrl,
  onCaptureData,
  currentConsolidatedData,
  equipmentLibrary,
  reorderControls,
}) {
  const [modalState, setModalState] = useState(initialModalState);

  const pendingResolveRef = useRef(null);
  const pendingRejectRef = useRef(null);
  const pendingResultRef = useRef(null);

  const closeModal = useCallback(() => {
    setModalState({ ...initialModalState });
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    const finalData = pendingResultRef.current;
    closeModal();

    if (pendingResolveRef.current) {
      pendingResolveRef.current(finalData);
    }
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    pendingResultRef.current = null;
  }, [closeModal]);

  const runPipeline = useCallback((mode) => {
    if (!imageFile) {
      return Promise.reject(new Error('Please upload an image first.'));
    }

    setModalState({ isOpen: true, status: 'loading', mode, steps: [], error: null });

    return new Promise(async (resolve, reject) => {
      pendingResolveRef.current = resolve;
      pendingRejectRef.current = reject;

      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const rawNodes = currentConsolidatedData?.nodes || null;
        let existingNodesList = [];
        if (rawNodes) {
          if (Array.isArray(rawNodes)) {
            existingNodesList = rawNodes;
          } else if (Array.isArray(rawNodes.equipment_nodes)) {
            existingNodesList = rawNodes.equipment_nodes;
          } else if (Array.isArray(rawNodes.nodes)) {
            existingNodesList = rawNodes.nodes;
          }
        }

        const contextPayload = {
          existing_nodes: existingNodesList,
          raw_nodes: rawNodes,
          equipment_library: equipmentLibrary || [],
        };

        if (process.env.NODE_ENV !== 'production') {
          console.debug('[BoundingBoxAuto] context payload', {
            rawNodesProvided: rawNodes ? true : false,
            existingCount: existingNodesList.length,
            equipmentCount: equipmentLibrary ? equipmentLibrary.length : 0,
          });
        }

        formData.append('context', JSON.stringify(contextPayload));

        const response = await fetch(`${API_BASE_URL}/tools/bounding-box-auto`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          const message = errorPayload.error || 'Automatic bounding box detection failed.';
          throw new Error(message);
        }

        const data = await response.json();
        const steps = data.steps || [];

        pendingResultRef.current = data;

        if (steps.length === 0) {
          closeModal();
          resolve(data);
          pendingResolveRef.current = null;
          pendingRejectRef.current = null;
          pendingResultRef.current = null;
          return;
        }

        const status = mode === 'debug' ? 'debug' : 'playing';
        setModalState({ isOpen: true, status, mode, steps, error: null });
      } catch (err) {
        console.error('Bounding box automation failed:', err);
        setModalState({
          isOpen: true,
          status: 'error',
          mode,
          steps: [],
          error: err.message || 'Automatic bounding box detection failed.',
        });

        if (pendingRejectRef.current) {
          pendingRejectRef.current(err);
        }
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
        pendingResultRef.current = null;
      }
    });
  }, [imageFile, closeModal]);

  const handleModalClose = useCallback(() => {
    closeModal();
    if (pendingRejectRef.current) {
      pendingRejectRef.current(new Error('Process cancelled.'));
    }
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    pendingResultRef.current = null;
  }, [closeModal]);

  const imageKey = useMemo(() => {
    if (imageFile) {
      const version = imageFile.lastModified || Date.now();
      return `${imageFile.name}-${version}`;
    }
    return imageUrl || '';
  }, [imageFile, imageUrl]);

  return (
    <>
      <AnalysisToolCard
        title="Bounding Box (Auto)"
        toolId="bounding-box-auto"
        imageUrl={imageKey}
        onCaptureData={onCaptureData}
        currentConsolidatedData={currentConsolidatedData}
        onRun={() => runPipeline('auto')}
        runButtonText="Run"
        isRunDisabled={!imageFile}
        captureKey="nodes"
        captureTransform={(data) => data?.nodes}
        reorderControls={reorderControls}
        additionalRunActions={[
          {
            label: 'Run (debug)',
            onRun: () => runPipeline('debug'),
            disabled: !imageFile,
          },
        ]}
      />

      <BoundingBoxAutoModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        mode={modalState.mode}
        steps={modalState.steps}
        error={modalState.error}
        onClose={modalState.status === 'error' ? handleModalClose : undefined}
        onPlaybackComplete={handlePlaybackComplete}
      />
    </>
  );
}

