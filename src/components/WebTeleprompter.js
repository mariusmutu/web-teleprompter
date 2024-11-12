import React, { useState, useRef, useEffect, useCallback } from 'react';

const WebTeleprompter = () => {
  const [hasPermission, setHasPermission] = useState(false);
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
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const chunksRef = useRef([]);

const initializeVideoElement = useCallback(async (streamToUse) => {
    console.log('Initializing video element...');
    
    // Wait for ref to be available
    if (!videoRef.current) {
      console.log('Waiting for video element to mount...');
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!videoRef.current) {
        throw new Error('Video element failed to mount');
      }
    }

    try {
      // Ensure we're starting fresh
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }

      // Set the stream
      videoRef.current.srcObject = streamToUse;
      
      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata load timeout'));
        }, 5000);

        videoRef.current.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        videoRef.current.onerror = (err) => {
          clearTimeout(timeout);
          reject(new Error(`Video error: ${err.target.error.message}`));
        };
      });

      // Attempt to play
      try {
        await videoRef.current.play();
        console.log('Video playing successfully');
        return true;
      } catch (playError) {
        throw new Error(`Failed to play video: ${playError.message}`);
      }
    } catch (err) {
      console.error('Video initialization error:', err);
      throw err;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setPermissionStatus('requesting');
      console.log('Starting camera...');

      // Stop any existing streams
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      console.log('Requesting media with constraints:', constraints);
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got new stream:', newStream.id);

      await initializeVideoElement(newStream);
      setStream(newStream);
      setHasPermission(true);
      setPermissionStatus('granted');
      setError(null);
    } catch (err) {
      console.error('Camera start error:', err);
      setError(err.message);
      setHasPermission(false);
      setPermissionStatus('denied');

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [facingMode, initializeVideoElement, stream]);

  // Mount effect with cleanup
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Your browser does not support camera access');
        return;
      }

      try {
        await startCamera();
      } catch (err) {
        if (mounted) {
          console.error('Mount effect camera error:', err);
          setError(err.message);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, stream]);


  // Auto-scroll effect with debouncing
  useEffect(() => {
    let scrollInterval;
    if (autoScroll && scrollContainerRef.current) {
      scrollInterval = setInterval(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop += scrollSpeed;
          }
        });
      }, 50);
    }
    return () => clearInterval(scrollInterval);
  }, [autoScroll, scrollSpeed]);

  const toggleRecording = useCallback(async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else if (stream) {
      try {
        chunksRef.current = [];
        const newMediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });
        
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
          a.download = `teleprompter-recording-${new Date().toISOString()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        newMediaRecorder.start();
        setMediaRecorder(newMediaRecorder);
        setIsRecording(true);
      } catch (err) {
        setError(`Recording failed: ${err.message}`);
      }
    }
  }, [isRecording, mediaRecorder, stream]);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  if (permissionStatus === 'checking' || permissionStatus === 'requesting') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">
            {permissionStatus === 'checking' ? 'Checking camera permissions...' : 'Requesting camera access...'}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
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
          <p className="text-white mb-4">Camera access is required for the teleprompter</p>
          <button 
            onClick={startCamera}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Grant Camera Access
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
            className="w-full h-40 mb-4 p-2 bg-transparent text-white text-2xl leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your script here..."
          />
          <div className="text-white text-2xl leading-relaxed whitespace-pre-line">
            {text}
          </div>
        </div>
        
        <div className="p-4 bg-black bg-opacity-75 flex justify-between items-center">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-4 py-2 rounded transition-colors ${
              autoScroll ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
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
            className={`px-4 py-2 rounded transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button
            onClick={toggleCamera}
            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Flip Camera
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebTeleprompter;