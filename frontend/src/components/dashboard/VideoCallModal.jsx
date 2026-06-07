import { useState, useEffect, useRef } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const VideoCallModal = ({
  socket,
  currentUserId,
  selectedChatUser,
  incomingCall,
  onClose,
}) => {
  const [callState, setCallState] = useState(
    incomingCall ? 'incoming' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  // Step 1: always get camera/mic first
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // If we are the caller, start the call immediately after getting stream
        if (!incomingCall) {
          startCall(stream);
        }
      })
      .catch(() => {
        setError('Camera/microphone access denied. Please allow permissions.');
      });

    // Socket listeners
    socket.on('call-accepted', (signal) => {
      setCallState('connected');
      peerRef.current
        ?.setRemoteDescription(new RTCSessionDescription(signal))
        .catch(() => setError('Failed to connect. Please try again.'));
    });

    socket.on('ice-candidate', ({ candidate }) => {
      if (candidate && peerRef.current) {
        peerRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch(console.error);
      }
    });

    socket.on('call-ended', () => {
      cleanup();
      onClose();
    });

    return () => {
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      cleanup();
    };
  }, []);

  const createPeerConnection = (stream) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    // Add our stream tracks to the connection
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    // When we receive the other person's stream
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates to the other peer via server
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const targetUserId = incomingCall
          ? incomingCall.callerId
          : selectedChatUser._id;
        socket.emit('ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected'
      ) {
        setError('Connection lost. The call has ended.');
        cleanup();
      }
    };

    return peer;
  };

  // Called when YOU are the caller
  const startCall = async (stream) => {
    const peer = createPeerConnection(stream);
    peerRef.current = peer;

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('call-user', {
      userToCall: selectedChatUser._id,
      signalData: offer,
      from: currentUserId,
      name: 'User',
    });
  };

  // Called when YOU answer the incoming call
  const answerCall = async () => {
    if (!streamRef.current) return;
    setCallState('connected');

    const peer = createPeerConnection(streamRef.current);
    peerRef.current = peer;

    await peer.setRemoteDescription(
      new RTCSessionDescription(incomingCall.signal)
    );
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit('answer-call', {
      signal: answer,
      to: incomingCall.callerId,
    });
  };

  const cleanup = () => {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const endCall = () => {
    const targetUserId = incomingCall
      ? incomingCall.callerId
      : selectedChatUser?._id;
    if (targetUserId) {
      socket.emit('end-call', { to: targetUserId });
    }
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOff(!videoTrack.enabled);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl bg-[var(--bg-panel)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]">

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-panel)] p-8 text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
            >
              Close
            </button>
          </div>
        )}

        {/* Videos */}
        <div className="relative bg-black aspect-video w-full">
          {/* Remote video (full size) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Placeholder when not connected yet */}
          {callState !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold mb-3">
                {selectedChatUser?.username?.[0]?.toUpperCase() ||
                  incomingCall?.name?.[0]?.toUpperCase() ||
                  '?'}
              </div>
              {callState === 'calling' && (
                <>
                  <p className="text-sm font-medium">{selectedChatUser?.username}</p>
                  <p className="text-xs text-gray-400 mt-1 animate-pulse">Calling...</p>
                </>
              )}
              {callState === 'incoming' && (
                <>
                  <p className="text-sm font-medium">{incomingCall?.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Incoming video call</p>
                </>
              )}
            </div>
          )}

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-3 right-3 w-32 aspect-video rounded-lg overflow-hidden border-2 border-white/20 bg-black shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isCamOff ? 'opacity-0' : ''}`}
            />
            {isCamOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400 text-xs">
                Cam off
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 flex items-center justify-center gap-4 bg-[var(--bg-header)]">

          {/* Answer button — only for receiver before picking up */}
          {callState === 'incoming' && (
            <button
              onClick={answerCall}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition active:scale-95"
            >
              Answer
            </button>
          )}

          <button
            onClick={toggleMute}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition active:scale-95 ${
              isMuted
                ? 'bg-red-600/20 border-red-500/40 text-red-400'
                : 'bg-[var(--bg-sidebar)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={toggleCam}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition active:scale-95 ${
              isCamOff
                ? 'bg-red-600/20 border-red-500/40 text-red-400'
                : 'bg-[var(--bg-sidebar)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {isCamOff ? 'Cam On' : 'Cam Off'}
          </button>

          <button
            onClick={endCall}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition active:scale-95"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};