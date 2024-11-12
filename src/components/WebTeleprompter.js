import React, { useState, useRef, useEffect, useCallback } from 'react';

const WebTeleprompter = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [text, setText] = useState(
    'Welcome to the web teleprompter! Edit this text to add your script...'
  );
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [facingMode, setFacingMode] = useState('user');

  const videoRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const chunksRef = useRef([]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasPermission(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    let scrollInterval;
    if (autoScroll) {
      scrollInterval = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed;
        }
      }, 50);
    }
    return () => clearInterval(scrollInterval);
  }, [autoScroll, scrollSpeed]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      chunksRef.current = [];
      const stream = videoRef.current.srcObject;
      const newMediaRecorder = new MediaRecorder(stream);
      
      newMediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      newMediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'teleprompter-recording.webm';
        a.click();
        URL.revokeObjectURL(url);
      };

      newMediaRecorder.start();
      setMediaRecorder(newMediaRecorder);
      setIsRecording(true);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button 
          onClick={startCamera}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Allow Camera Access
        </button>
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