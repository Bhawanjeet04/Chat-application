import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

export const VideoCallModal = ({ socket, selectedChatUser, currentUserId, isIncomingCall, incomingOffer, onClose }) => {
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isCallAccepted, setIsCallAccepted] = useState(!isIncomingCall);
  const [iceState, setIceState] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const remoteDescSetRef = useRef(false); // ✅ Track if remote desc is set

  // ─── Fetch ICE Servers ────────────────────────────────────────────────────
  const fetchIceServers = async () => {
    try {
      const serverBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.get(`${serverBase}/api/turn-credentials`, {
        withCredentials: true
      });
      const servers = res.data.iceServers;
      console.log('✅ ICE servers fetched:', servers);
      return servers;
    } catch (err) {
      console.warn('⚠️ Could not fetch TURN credentials from backend:', err.message);
      // Only use STUN as last resort — TURN fallback with static creds is unreliable
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  };

  // ─── Process queued ICE candidates ───────────────────────────────────────
  const processIceQueue = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !remoteDescSetRef.current) return;

    console.log(`Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error processing queued ICE candidate', e);
      }
    }
  }, []);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !selectedChatUser) return;

    socket.on('video_call_busy', (data) => {
      alert(data.message);
      cleanUpTracks();
      if (typeof onClose === 'function') onClose();
    });

    // ✅ FIX: Set remote description then flush ICE queue atomically
    socket.on('video_call_answer_received', async (data) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        remoteDescSetRef.current = true; // ✅ Mark as set
        console.log('✅ Remote description (answer) set');
        await processIceQueue();
        setCallStatus('Connected Live');
      } catch (err) {
        console.error('Error setting remote description (answer):', err);
      }
    });

    // ✅ FIX: Always queue candidates if remote desc not yet set
    socket.on('ice_candidate_received', async (data) => {
      if (!data.candidate) return;
      const pc = peerConnectionRef.current;

      if (pc && remoteDescSetRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate immediately:', e);
        }
      } else {
        console.log('Queuing ICE candidate (remote desc not ready yet)');
        iceCandidatesQueueRef.current.push(data.candidate);
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

  // ─── Core WebRTC setup ────────────────────────────────────────────────────
  const initializeCall = async () => {
    try {
      const iceServers = await fetchIceServers();
      console.log('Using ICE servers:', iceServers);

      // ✅ FIX: Request media BEFORE creating peer connection
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers,
        // ✅ FIX: Force relay if you want to guarantee TURN usage (good for debugging)
        // iceTransportPolicy: 'relay',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      });
      peerConnectionRef.current = pc;
      remoteDescSetRef.current = false;

      // ✅ Add local tracks BEFORE creating offer/answer
      stream.getTracks().forEach(track => {
        console.log(`Adding local track: ${track.kind}`);
        pc.addTrack(track, stream);
      });

      // ✅ FIX: Robust ontrack — always attach to video element reactively
      pc.ontrack = (event) => {
        console.log('ontrack fired:', event.track.kind, event.streams.length);
        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            console.log('✅ Remote stream attached via event.streams[0]');
          } else {
            // Fallback: build MediaStream manually
            if (!remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = new MediaStream();
            }
            remoteVideoRef.current.srcObject.addTrack(event.track);
            console.log('✅ Remote track added manually to MediaStream');
          }
        }
      };

      // ✅ FIX: Monitor ICE connection state for debugging + UI feedback
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('ICE connection state:', state);
        setIceState(state);
        if (state === 'connected' || state === 'completed') {
          setCallStatus('Connected Live');
        } else if (state === 'failed') {
          setCallStatus('Connection Failed — Check Network');
          console.error('❌ ICE connection failed. TURN server may be unreachable.');
        } else if (state === 'disconnected') {
          setCallStatus('Reconnecting...');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('PeerConnection state:', pc.connectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate.type, event.candidate.protocol);
          socket.emit('ice_candidate', {
            recipientId: selectedChatUser._id || selectedChatUser.userId,
            candidate: event.candidate,
          });
        } else {
          console.log('ICE candidate gathering complete');
        }
      };

      // ─── Answerer path ────────────────────────────────────────────────────
      if (isIncomingCall && incomingOffer) {
        console.log('📞 Answerer: setting remote offer...');
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        remoteDescSetRef.current = true; // ✅ Mark before flushing queue
        console.log('✅ Remote description (offer) set');

        await processIceQueue(); // ✅ Flush any candidates that arrived before offer was set

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('video_call_answer', {
          recipientId: selectedChatUser._id || selectedChatUser.userId,
          answer,
        });

        setCallStatus('Ringing...');

      // ─── Caller path ──────────────────────────────────────────────────────
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
      console.error('Could not gain access to media streams:', err);
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
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    iceCandidatesQueueRef.current = [];
    remoteDescSetRef.current = false;
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-colors duration-200">

        <div className="p-4 bg-[var(--bg-header)] border-b border-[var(--border-color)] flex justify-between items-center transition-colors duration-200">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Video Session with @{selectedChatUser.username}
            </h3>
            <p className="text-xs text-blue-500 font-medium mt-0.5">{callStatus}</p>
            {/* ✅ Debug ICE state visible during development — remove in prod */}
            {iceState && (
              <p className="text-[10px] text-gray-500 mt-0.5">ICE: {iceState}</p>
            )}
          </div>
        </div>

        {!isCallAccepted ? (
          <div className="flex-1 bg-black min-h-[480px] flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-full flex items-center justify-center text-2xl animate-bounce">
              📞
            </div>
            <p className="text-sm text-gray-400">@{selectedChatUser.username} is calling you...</p>
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
            <div className="flex-1 bg-black min-h-[480px] relative overflow-hidden flex items-center justify-center">

              {/* Remote video (full screen) */}
              <div className="absolute inset-0 w-full h-full bg-[#0c0c0e]">
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

              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-36 h-48 sm:w-44 sm:h-56 bg-[var(--bg-main)] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10 transition-all duration-300 hover:scale-105">
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

            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex justify-center transition-colors duration-200">
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