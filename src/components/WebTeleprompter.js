import React, { useState, useRef, useEffect, useCallback } from 'react';

const WebTeleprompter = () => {
  // ... previous state declarations ...

  const handleVideoLoad = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
        setError("Failed to play video stream");
      });
    }
  };

  const startCamera = useCallback(async () => {
    try {
      // First, stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('Requesting camera access...');
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera access granted');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video tracks are enabled
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
        });
        setHasPermission(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(err.message);
      setHasPermission(false);
    }
  }, [facingMode]);

  // ... rest of the previous code ...

  return (
    <div className="h-screen w-full bg-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleVideoLoad}
        className="w-full h-full object-cover"
      />
      
      {/* ... rest of the UI ... */}
    </div>
  );
};

export default WebTeleprompter;