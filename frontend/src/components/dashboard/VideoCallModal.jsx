import { useState, useEffect, useRef } from 'react';

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "5b0a0a3312d5ebf016c30014",
      credential: "3KhFRYRGZudkCqlf",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "5b0a0a3312d5ebf016c30014",
      credential: "3KhFRYRGZudkCqlf",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "5b0a0a3312d5ebf016c30014",
      credential: "3KhFRYRGZudkCqlf",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "5b0a0a3312d5ebf016c30014",
      credential: "3KhFRYRGZudkCqlf",
    },
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
  const iceCandidateQueue = useRef([]); // ← queue for early ICE candidates

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log('✅ Got camera/mic stream');
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (!incomingCall) {
          startCall(stream);
        }
      })
      .catch((e) => {
        console.error('❌ getUserMedia failed', e);
        setError('Camera/microphone access denied. Please allow permissions.');
      });

    socket.on('call-accepted', (signal) => {
      console.log('✅ call-accepted received', signal);
      setCallState('connected');
      peerRef.current
        ?.setRemoteDescription(new RTCSessionDescription(signal))
        .then(() => {
          console.log('✅ Remote description set on caller side');
          // flush queued ICE candidates now that remote is set
          iceCandidateQueue.current.forEach((candidate) => {
            peerRef.current
              .addIceCandidate(new RTCIceCandidate(candidate))
              .then(() => console.log('✅ Queued ICE candidate added'))
              .catch((e) => console.error('❌ Queued ICE candidate failed', e));
          });
          iceCandidateQueue.current = [];
        })
        .catch((e) => console.error('❌ setRemoteDescription failed on caller', e));
    });

    socket.on('ice-candidate', ({ candidate }) => {
      console.log('📨 ICE candidate received', candidate);
      if (!candidate) return;

      if (peerRef.current && peerRef.current.remoteDescription) {
        peerRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => console.log('✅ ICE candidate added'))
          .catch((e) => console.error('❌ addIceCandidate failed', e));
      } else {
        // remote description not set yet — queue it
        console.warn('⚠️ ICE candidate queued (remoteDescription not set yet)');
        iceCandidateQueue.current.push(candidate);
      }
    });

    socket.on('call-ended', () => {
      console.log('📵 call-ended received');
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
    console.log('🔧 Creating peer connection');
    const peer = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
      console.log('✅ Track added:', track.kind);
    });

    peer.ontrack = (event) => {
      console.log('✅ Remote track received:', event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const targetUserId = incomingCall
          ? incomingCall.callerId
          : selectedChatUser._id;
        console.log('📤 Sending ICE candidate to:', targetUserId);
        socket.emit('ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
        });
      } else {
        console.log('✅ ICE gathering complete');
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', peer.iceConnectionState);
    };

    peer.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peer.connectionState);
      if (peer.connectionState === 'connected') {
        console.log('✅ Peers fully connected!');
        setCallState('connected');
      }
      if (peer.connectionState === 'failed') {
        console.error('❌ Connection failed');
        setError('Connection failed. Please try again.');
        cleanup();
      }
      // disconnected = temporary, do NOT kill the call here
    };

    return peer;
  };

  const startCall = async (stream) => {
    console.log('📞 startCall fired, calling:', selectedChatUser._id);
    const peer = createPeerConnection(stream);
    peerRef.current = peer;

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    console.log('✅ Offer created and set as local description');

    socket.emit('call-user', {
      userToCall: selectedChatUser._id,
      signalData: offer,
      from: currentUserId,
      name: 'User',
    });
    console.log('✅ call-user emitted to:', selectedChatUser._id);
  };

  const answerCall = async () => {
    console.log('📞 answerCall fired');
    if (!streamRef.current) {
      console.error('❌ No stream available when answering');
      return;
    }
    setCallState('connected');

    const peer = createPeerConnection(streamRef.current);
    peerRef.current = peer;

    console.log('Setting remote description from offer...');
    await peer.setRemoteDescription(
      new RTCSessionDescription(incomingCall.signal)
    );
    console.log('✅ Remote description set on receiver');

    // flush any queued ICE candidates
    iceCandidateQueue.current.forEach((candidate) => {
      peer
        .addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => console.log('✅ Queued ICE candidate added after answer'))
        .catch((e) => console.error('❌ Queued ICE failed after answer', e));
    });
    iceCandidateQueue.current = [];

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log('✅ Answer created and set as local description');

    socket.emit('answer-call', {
      signal: answer,
      to: incomingCall.callerId,
    });
    console.log('✅ answer-call emitted to:', incomingCall.callerId);
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up peer connection and stream');
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    iceCandidateQueue.current = [];
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

        <div className="relative bg-black aspect-video w-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

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

        <div className="px-6 py-4 flex items-center justify-center gap-4 bg-[var(--bg-header)]">
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