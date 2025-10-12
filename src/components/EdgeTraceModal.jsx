import React, { useEffect, useRef, useState } from 'react';

const API_BASE_URL = "http://localhost:5000";

const EdgeTraceModal = ({ isOpen, onClose, imageFile, imageUrl, mode, onResult }) => {
  const [status, setStatus] = useState('Waiting to start...');
  const [step, setStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [outputText, setOutputText] = useState('');
  const [intermediateImageUrl, setIntermediateImageUrl] = useState(null);
  const [finalJson, setFinalJson] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimeoutRef = useRef(null);

  const resetState = () => {
    setStatus('Waiting to start...');
    setStep(0);
    setTotalSteps(0);
    setOutputText('');
    setIntermediateImageUrl(imageUrl); // Start with the original image
    setFinalJson(null);
    setIsComplete(false);
    setError(null);
    setJobId(null);
    setIsProcessing(false);
    setIsAutoPlaying(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initiateTrace = async () => {
      resetState();
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const initiateResponse = await fetch(`${API_BASE_URL}/tools/edge-trace/initiate`, {
          method: 'POST',
          body: formData,
        });

        if (!initiateResponse.ok) {
          const errData = await initiateResponse.json();
          throw new Error(errData.error || 'Failed to initiate trace job.');
        }

        const { job_id } = await initiateResponse.json();
        setJobId(job_id);
        setStatus(mode === 'auto' ? 'Ready to start automatic trace.' : 'Ready to start. Click "Run Next Step".');
        if (mode === 'auto') {
          setIsAutoPlaying(true);
        }
      } catch (err) {
        console.error("Failed to initiate trace process:", err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };

    initiateTrace();
  }, [isOpen, imageFile, imageUrl, mode]);

  const handleRunNextStep = async () => {
    if (!jobId || isProcessing || isComplete) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/tools/edge-trace/execute-step/${jobId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute step.');
      }

      // Update state with the result of the step
      setStatus(data.status);
      setStep(data.step);
      setTotalSteps(data.total_steps);
      setOutputText(data.output_text);
      if (data.image_url) {
        setIntermediateImageUrl(`${data.image_url}?t=${new Date().getTime()}`);
      }

      if (data.is_complete) {
        setIsComplete(true);
        setFinalJson(data.final_json);
        setStatus(data.message);
        setIsAutoPlaying(false);
        if (typeof onResult === 'function') {
          onResult(data.final_json);
        }
      }
    } catch (err) {
      console.error("Error during step execution:", err);
      setError(err.message);
      setIsAutoPlaying(false);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      return;
    }

    if (isComplete || error) {
      setIsAutoPlaying(false);
      return;
    }

    if (!isProcessing && jobId) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        handleRunNextStep().catch(() => setIsAutoPlaying(false));
      }, 500);
    }

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
    };
  }, [isOpen, isAutoPlaying, isProcessing, isComplete, error, jobId, step]);

  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const nextStepButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isComplete) return 'Finished';
    return 'Run Next Step';
  };

  const handleClose = () => {
    setIsAutoPlaying(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Edge Trace Progress</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-grow p-4 overflow-y-auto grid grid-cols-1 gap-4">
          {/* Main content area: Image and Status */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="border rounded-lg p-2 bg-gray-50 shadow-sm flex-grow flex items-center justify-center min-h-0">
              <img
                src={intermediateImageUrl || '/placeholder.png'}
                alt="Processing Step"
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>
            <div className="p-4 bg-gray-100 rounded-lg flex-shrink-0">
              <h3 className="font-semibold text-lg">Status</h3>
              <p className="text-gray-700">{status}</p>
              {totalSteps > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  ></div>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">{outputText}</p>
              {error && <p className="text-red-500 mt-2">Error: {error}</p>}
            </div>
          </div>

        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <div>
            <button
              onClick={handleRunNextStep}
              disabled={isProcessing || isComplete || !jobId || isAutoPlaying}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {nextStepButtonText()}
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeTraceModal;
