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
  const [permissionStatus, setPermissionStatus] = useState('checking'); // Add this state

  const videoRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      setPermissionStatus('requesting');
      console.log('Starting camera initialization...');

      // First, stop any existing stream
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

      console.log('Constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtained:', stream.id);
      
      const videoTracks = stream.getVideoTracks();
      console.log('Video tracks:', videoTracks.length);
      videoTracks.forEach(track => {
        console.log('Video track:', track.label, 'enabled:', track.enabled);
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Setting video source...');
        videoRef.current.srcObject = stream;
        
        // Ensure video tracks are enabled
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
          console.log('Track enabled:', track.label);
        });

        setHasPermission(true);
        setPermissionStatus('granted');
        setError(null);
        console.log('Camera setup complete');
      } else {
        console.error('Video ref is null');
        setError('Video element not initialized');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(err.message);
      setHasPermission(false);
      setPermissionStatus('denied');
    }
  }, [facingMode]);

  // Request permissions on component mount
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
            // Let the user click the button to request permission
            setPermissionStatus('prompt');
            setHasPermission(false);
          } else {
            console.log('Permission denied');
            setPermissionStatus('denied');
            setHasPermission(false);
          }
        } catch (permErr) {
          console.log('Could not query permission status, trying direct access...');
          // Some browsers don't support permission query, try direct access
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

    // Cleanup function
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

  // ... rest of the component remains the same ...

  // Update the loading state render
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

  // Rest of the render logic remains the same...
};

export default WebTeleprompter;