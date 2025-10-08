import React, { useEffect, useState, useMemo } from 'react';

const DISPLAY_INTERVAL_MS = 600; // ensure at least 0.5s per frame

const statusMessages = {
  loading: 'Analyzing diagram...',
  playing: 'Replaying detection steps...',
  debug: 'Review each step manually.',
  error: 'Automatic bounding box detection failed.',
};

export default function BoundingBoxAutoModal({
  isOpen,
  status,
  mode = 'auto',
  steps,
  error,
  onClose,
  onPlaybackComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      return;
    }
    if (status === 'playing' || status === 'debug') {
      setCurrentIndex(0);
    }
  }, [isOpen, status, steps]);

  useEffect(() => {
    if (!isOpen || mode === 'debug' || status !== 'playing' || !steps || steps.length === 0) {
      return undefined;
    }

    if (currentIndex >= steps.length - 1) {
      const timer = setTimeout(() => {
        onPlaybackComplete?.();
      }, DISPLAY_INTERVAL_MS);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, DISPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isOpen, status, steps, currentIndex, onPlaybackComplete]);

  const progressPercent = useMemo(() => {
    if (!steps || steps.length === 0) {
      return status === 'loading' ? 10 : 0;
    }
    return Math.round(((currentIndex + 1) / steps.length) * 100);
  }, [steps, currentIndex, status]);

  if (!isOpen) {
    return null;
  }

  const activeStep = steps && steps.length > 0 ? steps[Math.min(currentIndex, steps.length - 1)] : null;
  const message = statusMessages[status] || '';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Bounding Box Automation</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${status === 'error' ? 'bg-red-500' : 'bg-blue-500'} transition-all duration-300`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          <div className="text-sm text-gray-700">{message}</div>

          {status === 'error' && (
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4 text-sm">
              {error || 'An unexpected error occurred while processing the image.'}
            </div>
          )}

          {status !== 'error' && (
            <div className="flex-1 border rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
              {status === 'loading' && (
                <div className="text-gray-500 italic">Uploading and processing image...</div>
              )}
              {(status === 'playing' || status === 'debug') && activeStep && (
                <div className="w-full h-full flex flex-col">
                  <div className="p-3 border-b text-sm font-medium text-gray-600">
                    Step {currentIndex + 1} of {steps.length}: {activeStep.name}
                  </div>
                  <div className="flex-1 flex items-center justify-center bg-white">
                    <img
                      src={`${activeStep.image_url}?t=${currentIndex}`}
                      alt={activeStep.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {(status === 'debug' || status === 'error') && (
          <div className="p-4 border-t flex justify-end space-x-2">
            {status === 'debug' && (
              <button
                onClick={() => {
                  if (!steps || steps.length === 0) {
                    return;
                  }
                  const isLast = currentIndex === steps.length - 1;
                  if (isLast) {
                    onPlaybackComplete?.();
                  } else {
                    const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
                    setCurrentIndex(nextIndex);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {currentIndex === (steps?.length || 1) - 1 ? 'Finish' : 'Next Step'}
              </button>
            )}
            {status === 'error' && onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
