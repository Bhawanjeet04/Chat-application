import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Free public ICE servers — no API key needed ──────────────────────────
// Uses Google + Cloudflare STUN + Open Relay free TURN
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Open Relay — free public TURN, no signup needed
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:80?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export const VideoCallModal = ({
  socket,
  selectedChatUser,
  currentUserId,
  isIncomingCall,
  incomingOffer,
  onClose,
}) => {
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isCallAccepted, setIsCallAccepted] = useState(!isIncomingCall);
  const [iceState, setIceState] = useState('');

  const localVideoRef       = useRef(null);
  const remoteVideoRef      = useRef(null);
  const peerConnectionRef   = useRef(null);
  const localStreamRef      = useRef(null);
  const iceCandidatesQueue  = useRef([]);
  const remoteDescSet       = useRef(false);

  // ─── Flush queued ICE candidates once remote desc is ready ───────────────
  const processIceQueue = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !remoteDescSet.current) return;
    console.log(`🧊 Flushing ${iceCandidatesQueue.current.length} queued ICE candidates`);
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE candidate add failed (queued):', e.message);
      }
    }
  }, []);

  // ─── Socket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !selectedChatUser) return;

    socket.on('video_call_busy', (data) => {
      alert(data.message);
      cleanUpTracks();
      if (typeof onClose === 'function') onClose();
    });

    socket.on('video_call_answer_received', async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        remoteDescSet.current = true;
        console.log('✅ Remote description (answer) set');
        await processIceQueue();
      } catch (err) {
        console.error('Error setting remote description (answer):', err);
      }
    });

    socket.on('ice_candidate_received', async (data) => {
      if (!data.candidate) return;
      const pc = peerConnectionRef.current;
      if (pc && remoteDescSet.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('ICE candidate add failed (live):', e.message);
        }
      } else {
        iceCandidatesQueue.current.push(data.candidate);
      }
    });

    socket.on('video_call_ended', () => {
      cleanUpTracks();
      onClose();
    });

    return () => {
      socket.off('video_call_answer_received');
      socket.off('ice_candidate_received');
      socket.off('video_call_ended');
      socket.off('video_call_busy');
    };
  }, [socket, selectedChatUser, processIceQueue]);

  useEffect(() => {
    if (isCallAccepted) {
      initializeCall();
    } else {
      setCallStatus(`Incoming call from @${selectedChatUser.username}...`);
    }
    return () => cleanUpTracks();
  }, [isCallAccepted]);

  // ─── Core WebRTC logic ────────────────────────────────────────────────────
  const initializeCall = async () => {
    try {
      console.log('📡 Using ICE servers:', ICE_SERVERS);

      // Get local media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Create peer connection with all free ICE servers
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10,
      });
      peerConnectionRef.current = pc;
      remoteDescSet.current = false;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        console.log(`➕ Adding local track: ${track.kind}`);
        pc.addTrack(track, stream);
      });

      // Remote track handler
      pc.ontrack = (event) => {
        console.log('📥 ontrack:', event.track.kind, '| streams:', event.streams.length);
        if (!remoteVideoRef.current) return;
        if (event.streams?.[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          if (!remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject = new MediaStream();
          }
          remoteVideoRef.current.srcObject.addTrack(event.track);
        }
      };

      // ICE candidate — send to peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`📤 Sending ICE: ${event.candidate.type} ${event.candidate.protocol}`);
          socket.emit('ice_candidate', {
            recipientId: selectedChatUser._id || selectedChatUser.userId,
            candidate: event.candidate,
          });
        } else {
          console.log('✅ ICE gathering complete');
        }
      };

      // Connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('🧊 ICE state:', state);
        setIceState(state);
        if (state === 'connected' || state === 'completed') {
          setCallStatus('Connected Live');
        } else if (state === 'failed') {
          setCallStatus('Connection Failed');
          console.error('❌ ICE failed — trying to restart ICE...');
          // Auto restart ICE on failure
          pc.restartIce();
        } else if (state === 'disconnected') {
          setCallStatus('Reconnecting...');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Peer connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.error('❌ Peer connection failed');
          setCallStatus('Call Failed — Please retry');
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log('🔍 ICE gathering state:', pc.iceGatheringState);
      };

      // ── Answerer path ──────────────────────────────────────────────────
      if (isIncomingCall && incomingOffer) {
        console.log('📞 Answerer: setting remote offer...');
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        remoteDescSet.current = true;
        await processIceQueue();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('video_call_answer', {
          recipientId: selectedChatUser._id || selectedChatUser.userId,
          answer,
        });
        setCallStatus('Ringing...');

      // ── Caller path ────────────────────────────────────────────────────
      } else {
        console.log('📤 Caller: creating offer...');
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit('video_call_offer', {
          connectionId: selectedChatUser.connectionId,
          recipientId: selectedChatUser._id || selectedChatUser.userId,
          senderId: currentUserId,
          offer,
        });
        setCallStatus('Ringing...');
      }
    } catch (err) {
      console.error('❌ Call setup error:', err);
      if (err.name === 'NotAllowedError') {
        setCallStatus('Camera/Mic Permission Denied');
      } else if (err.name === 'NotFoundError') {
        setCallStatus('No Camera/Mic Found');
      } else {
        setCallStatus('Connection Error');
      }
    }
  };

  const handleEndCall = () => {
    socket.emit('end_video_call', {
      recipientId: selectedChatUser._id || selectedChatUser.userId,
      senderId: currentUserId,
    });
    cleanUpTracks();
    onClose();
  };

  const cleanUpTracks = () => {
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    iceCandidatesQueue.current = [];
    remoteDescSet.current = false;
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-colors duration-200">

        {/* Header */}
        <div className="p-4 bg-[var(--bg-header)] border-b border-[var(--border-color)] flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Video Session with @{selectedChatUser.username}
            </h3>
            <p className="text-xs text-blue-500 font-medium mt-0.5">{callStatus}</p>
            {iceState && (
              <p className="text-[10px] text-gray-500 mt-0.5">ICE: {iceState}</p>
            )}
          </div>
        </div>

        {/* Incoming call screen */}
        {!isCallAccepted ? (
          <div className="flex-1 bg-black min-h-[480px] flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-full flex items-center justify-center text-2xl animate-bounce">
              📞
            </div>
            <p className="text-sm text-gray-400">
              @{selectedChatUser.username} is calling you...
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsCallAccepted(true)}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 font-bold rounded-xl text-xs tracking-wider text-white uppercase transition active:scale-95 cursor-pointer"
              >
                Accept Call
              </button>
              <button
                onClick={handleEndCall}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 font-bold rounded-xl text-xs tracking-wider text-white uppercase transition active:scale-95 cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* Video area */}
            <div className="flex-1 bg-black min-h-[480px] relative overflow-hidden">

              {/* Remote video — full screen */}
              <div className="absolute inset-0 bg-[#0c0c0e]">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-[11px] font-medium px-2.5 py-1 rounded-md text-gray-200 z-20 border border-white/5">
                  @{selectedChatUser.username}
                </span>
              </div>

              {/* Local video — PiP */}
              <div className="absolute top-4 right-4 w-36 h-48 sm:w-44 sm:h-56 bg-[var(--bg-main)] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10 hover:scale-105 transition-all duration-300">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[9px] px-1.5 py-0.5 rounded text-gray-300">
                  You
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex justify-center">
              <button
                onClick={handleEndCall}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg transition duration-150 cursor-pointer"
              >
                End Call
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};