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
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      setPermissionStatus('requesting');
      console.log('Starting camera initialization...');

      if (streamRef.current) {
        console.log('Stopping existing stream...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
      }

      console.log('Requesting camera access with facing mode:', facingMode);
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtained:', stream.id);
      
      const videoTracks = stream.getVideoTracks();
      console.log('Video tracks:', videoTracks.length);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Setting video source...');
        
        // Remove any existing srcObject
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }
        
        // Set the new stream
        videoRef.current.srcObject = stream;
        
        // Ensure video tracks are enabled
        videoTracks.forEach(track => {
          track.enabled = true;
          console.log('Track enabled:', track.label);
        });

        try {
          console.log('Attempting to play video...');
          await videoRef.current.play();
          console.log('Video playback started successfully');
          setHasPermission(true);
          setPermissionStatus('granted');
          setError(null);
        } catch (playError) {
          console.error('Error playing video:', playError);
          setError('Failed to start video playback: ' + playError.message);
          setPermissionStatus('error');
        }
      } else {
        console.error('Video ref is null');
        setError('Video element not initialized');
        setPermissionStatus('error');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(err.message);
      setHasPermission(false);
      setPermissionStatus('denied');
    }
  }, [facingMode]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log('Checking browser support...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support camera access');
        }

        console.log('Browser supports mediaDevices');
        try {
          // Check camera permission state
          const permissionResult = await navigator.permissions.query({ name: 'camera' });
          console.log('Permission state:', permissionResult.state);
          
          if (permissionResult.state === 'granted') {
            console.log('Permission already granted, starting camera...');
            await startCamera();
          } else if (permissionResult.state === 'prompt') {
            console.log('Permission needs to be requested...');
            setPermissionStatus('prompt');
            setHasPermission(false);
          } else {
            console.log('Permission denied');
            setPermissionStatus('denied');
            setHasPermission(false);
          }
        } catch (permErr) {
          console.log('Could not query permission status, trying direct access...');
          await startCamera();
        }
      } catch (err) {
        console.error("Permission check failed:", err);
        setError(err.message);
        setHasPermission(false);
        setPermissionStatus('error');
      }
    };

    checkPermissions();

    return () => {
      if (streamRef.current) {
        console.log('Cleaning up streams...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
      }
    };
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
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else if (streamRef.current) {
      chunksRef.current = [];
      const newMediaRecorder = new MediaRecorder(streamRef.current);
      
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

  if (permissionStatus === 'checking' || permissionStatus === 'requesting') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-center">
          <p className="mb-4">
            {permissionStatus === 'checking' ? 'Checking camera permissions...' : 'Requesting camera access...'}
          </p>
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
        onLoadedMetadata={() => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video after metadata load:', err);
              setError('Failed to play video: ' + err.message);
            });
          }
        }}
        onError={(e) => {
          console.error('Video element error:', e);
          setError('Video error: ' + (e.target.error?.message || 'Unknown error'));
        }}
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