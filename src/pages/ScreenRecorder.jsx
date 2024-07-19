import React, { useState, useRef, useEffect } from 'react';
import './ScreenRecorder.css';
import RecordRTC from 'recordrtc';

const peerConnection = new RTCPeerConnection(/* Configuration */);

const getRemoteAudioStream = async (peerConnection) => {
  return new Promise((resolve, reject) => {
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        resolve(remoteStream);
      } else {
        reject(new Error('No remote stream found'));
      }
    };
    setTimeout(() => {
      reject(new Error('Timeout: No remote stream received'));
    }, 5000);
  });
};

const ScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const autoRecordIntervalRef = useRef(null);
  const chunksRef = useRef([]);
  const [callRecorder, setCallRecorder] = useState(null);

  // Start call recording
  const startCallRecording = async () => {
    try {
      const remoteStream = await getRemoteAudioStream(peerConnection);
      console.log('Remote stream acquired:', remoteStream);

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Local stream acquired:', localStream);

      const combinedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        ...remoteStream.getAudioTracks()
      ]);

      console.log('Combined stream:', combinedStream);

      const recorder = new RecordRTC(combinedStream, { type: 'audio' });
      recorder.startRecording();
      setCallRecorder(recorder);
      console.log('Call recording started.');
    } catch (error) {
      console.error('Error starting call recording:', error);
      alert('Failed to start call recording. Please grant permissions and try again.');
    }
  };

  // Stop call recording
  const stopCallRecording = () => {
    if (callRecorder) {
      callRecorder.stopRecording(() => {
        const callBlob = callRecorder.getBlob();
        if (callBlob) {
          console.log('Call recording stopped. Blob created.');
          setRecordedBlobs(prevBlobs => [...prevBlobs, callBlob]);
          setCallRecorder(null); // Clear callRecorder after stopping
        } else {
          console.error('Failed to get call recording Blob');
        }
      });
    } else {
      console.error('No call recording to stop');
    }
  };

  // Start screen recording
  const startRecording = async (isAuto = false) => {
    try {
      let screenStream;
      if (isAuto) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            logicalSurface: true,
            cursor: 'never'
          },
          audio: true,
          preferCurrentTab: true
        });
      } else {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }
      console.log('Screen stream acquired:', screenStream);

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Audio stream acquired:', audioStream);

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      const mediaRecorder = new RecordRTC(combinedStream, { type: 'video' });
      mediaRecorder.startRecording();
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Data available:', event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('Screen recording stopped. Blob created.');
        setRecordedBlobs(prevBlobs => [...prevBlobs, blob]);
        chunksRef.current = [];
      };

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting screen recording:', error);
      alert('Failed to start screen recording. Please grant permissions and try again.');
    }
  };

  // Stop screen recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stopRecording(() => {
        const blob = mediaRecorderRef.current.getBlob();
        if (blob) {
          console.log('Screen recording stopped. Blob created.');
          setRecordedBlobs(prevBlobs => [...prevBlobs, blob]);
        } else {
          console.error('Failed to get screen recording Blob');
        }
      });
      setIsRecording(false);
    }
  };

  // Toggle auto recording
  const toggleAutoRecording = () => {
    setIsAutoRecording(prev => !prev);
  };

  // Handle auto recording intervals
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
    };
  }, [isAutoRecording]);

  // Download recording
  const downloadRecording = (blob, index) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `recording-${index + 1}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      console.error('Blob is not available for download');
    }
  };

  return (
    <div className="screen-recorder-container">
      <h2>Screen & Audio Recorder</h2>
      {!isRecording ? (
        <>
          <button onClick={() => startRecording(false)}>Start Manual Recording</button>
          <button onClick={startCallRecording}>Start Call Recording</button>
        </>
      ) : (
        <>
          <button onClick={stopRecording}>Stop Manual Recording</button>
          <button onClick={stopCallRecording}>Stop Call Recording</button>
        </>
      )}
      <button onClick={toggleAutoRecording}>
        {isAutoRecording ? 'Stop Auto Recording' : 'Start Auto Recording'}
      </button>
      {recordedBlobs.length > 0 && (
        <div className="recording-previews">
          <h3>Recording Previews:</h3>
          {recordedBlobs.map((blob, index) => (
            <div key={index} className="recording-preview">
              <video src={URL.createObjectURL(blob)} controls width="640" height="480" />
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
