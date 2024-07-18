import React, { useState, useRef, useEffect } from 'react';
import './ScreenRecorder.css';

const ScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const autoRecordIntervalRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async (isAuto = false) => {
    try {
      // Get screen and audio streams
      let screenStream;
      if (isAuto) {
        // For auto recording, capture the current tab without prompting
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            logicalSurface: true,
            cursor: 'never'
          },
          audio: true,
          preferCurrentTab: true // This is a proposed feature, might not work in all browsers
        });
      } else {
        // For manual recording, use the original options
        const displayMediaOptions = {
          video: {
            mediaSource: "window",
            cursor: "never"
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        };
        screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      }

      // Create separate audio stream for local audio
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up RTCPeerConnection for handling remote audio
      const peerConnection = new RTCPeerConnection();

      // Add audio track from remote peer to the combined stream
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getAudioTracks().forEach(track => {
            streamRef.current.addTrack(track); // Add remote audio track to combined stream
          });
        }
      };

      // Combine video and local audio into one stream
      streamRef.current = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      // Start recording with MediaRecorder
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlobs(prevBlobs => [...prevBlobs, blob]);
        chunksRef.current = [];
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting screen recording:', error);
      alert('Failed to start screen recording. Please grant permissions and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleAutoRecording = () => {
    setIsAutoRecording(prev => !prev);
  };

  useEffect(() => {
    if (isAutoRecording) {
      startRecording(true);
      autoRecordIntervalRef.current = setInterval(() => {
        stopRecording();
        startRecording(true);
      }, 5 * 60 * 1000); // 5 minutes interval
    } else {
      clearInterval(autoRecordIntervalRef.current);
      stopRecording();
    }

    return () => {
      clearInterval(autoRecordIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAutoRecording]);

  const downloadRecording = (blob, index) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = `screen-recording-${index + 1}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen-recorder-container">
      <h2>Screen Recorder</h2>
      {!isRecording ? (
        <button onClick={() => startRecording(false)}>Start Manual Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Manual Recording</button>
      )}
      <button onClick={toggleAutoRecording}>
        {isAutoRecording ? 'Stop Auto Recording' : 'Start Auto Recording'}
      </button>
      {recordedBlobs.length > 0 && (
        <div className="recording-previews">
          <h3>Recording Previews:</h3>
          {recordedBlobs.map((blob, index) => (
            <div key={index} className="recording-preview">
              <video
                src={URL.createObjectURL(blob)}
                controls
                width="640"
                height="480"
              />
              <br />
              <button onClick={() => downloadRecording(blob, index)}>
                Download Recording {index + 1}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;
