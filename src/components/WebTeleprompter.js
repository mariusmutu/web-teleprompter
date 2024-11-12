import React, { useState, useRef, useEffect, useCallback } from 'react';

const WebTeleprompter = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [text, setText] = useState(
    'Welcome to the web teleprompter! Edit this text to add your script...'
  );
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [permissionStatus, setPermissionStatus] = useState('checking');

  const videoRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const chunksRef = useRef([]);

  const startCamera = useCallback(async () => {
    try {
      setPermissionStatus('requesting');

      const constraints = {
        video: { facingMode },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setPermissionStatus('granted');
        setError(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setHasPermission(false);
      setPermissionStatus('denied');
    }
  }, [facingMode]); // Add facingMode as dependency

  // Check permissions when component mounts
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported');
        }
        await startCamera();
      } catch (err) {
        setError(err.message);
        setHasPermission(false);
        setPermissionStatus('error');
      }
    };

    checkPermissions();
  }, [startCamera]); // Add startCamera as dependency

  // Handle auto-scroll
  useEffect(() => {
    let interval;
    if (autoScroll) {
      interval = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed;
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [autoScroll, scrollSpeed]);

  const toggleRecording = useCallback(async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recording.webm';
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    }
  }, [isRecording, mediaRecorder]);

  const toggleCamera = useCallback(() => {
    setFacingMode(current => {
      const newMode = current === 'user' ? 'environment' : 'user';
      return newMode;
    });
  }, []);

  // Effect to handle camera changes
  useEffect(() => {
    if (hasPermission) {
      startCamera();
    }
  }, [facingMode, hasPermission, startCamera]);

  if (permissionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">Checking camera permissions...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-sm text-gray-400">Status: {permissionStatus}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-center p-4">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={startCamera}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-4">
          <p className="text-white mb-4">This app needs camera and microphone access to work</p>
          <button 
            onClick={startCamera}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Allow Camera Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      <div className="absolute inset-0 flex flex-col">
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-black bg-opacity-50 p-6"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-40 mb-4 p-2 bg-transparent text-white text-2xl leading-relaxed resize-none"
            placeholder="Enter your script here..."
          />
          <div className="text-white text-2xl leading-relaxed whitespace-pre-line">
            {text}
          </div>
        </div>
        
        <div className="p-4 bg-black bg-opacity-50 flex justify-between items-center">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-4 py-2 rounded ${
              autoScroll ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {autoScroll ? 'Stop Scroll' : 'Start Scroll'}
          </button>
          
          <div className="flex items-center space-x-2">
            <label className="text-white">Speed:</label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              className="w-24"
            />
          </div>
          
          <button
            onClick={toggleRecording}
            className={`px-4 py-2 rounded ${
              isRecording ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button
            onClick={toggleCamera}
            className="px-4 py-2 rounded bg-blue-500 text-white"
          >
            Flip Camera
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebTeleprompter;