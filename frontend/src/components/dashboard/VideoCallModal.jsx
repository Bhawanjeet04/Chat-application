import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export const VideoCallModal = ({ socket, selectedChatUser, currentUserId, isIncomingCall, incomingOffer, onClose }) => {
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isCallAccepted, setIsCallAccepted] = useState(!isIncomingCall);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]); 

  const fetchIceServers = async () => {
    try {
      const serverBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.get(`${serverBase}/api/turn-credentials`, {
        withCredentials: true
      });
      return res.data.iceServers;
    } catch (err) {
      console.warn('Could not fetch TURN credentials, falling back to dynamic TURN/STUN backup:', err.message);
      
      // ✅ FIX: Realigned to use consistent hardcoded infrastructure if connection fails
      return [
        { urls: "stun:global.relay.metered.ca:80" },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "5b0a0a3312d5ebf016c30014",
          credential: "3KhFRYRGZudKCqlf",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "5b0a0a3312d5ebf016c30014",
          credential: "3KhFRYRGZudKCqlf",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "5b0a0a3312d5ebf016c30014",
          credential: "3KhFRYRGZudKCqlf",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "5b0a0a3312d5ebf016c30014",
          credential: "3KhFRYRGZudKCqlf",
        }
      ];
    }
  };

  useEffect(() => {
    if (!socket || !selectedChatUser) return;

    socket.on('video_call_busy', (data) => {
      alert(data.message);
      cleanUpTracks();
      if (typeof onClose === 'function') onClose();
    });

    socket.on('video_call_answer_received', async (data) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallStatus('Connected Live');
          await processIceQueue(); 
        } catch (err) {
          console.error("Error setting remote description answer", err);
        }
      }
    });

    socket.on('ice_candidate_received', async (data) => {
      if (!data.candidate) return;
      
      const pc = peerConnectionRef.current;

      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding immediate ICE candidate", e);
        }
      } else {
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
  }, [socket, selectedChatUser]);

  useEffect(() => {
    if (isCallAccepted) {
      initializeCall();
    } else {
      setCallStatus(`Incoming call from @${selectedChatUser.username}...`);
    }
    
    return () => cleanUpTracks();
  }, [isCallAccepted]);

  const processIceQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error processing queued ICE candidate", e);
      }
    }
  };

  const initializeCall = async () => {
    try {
      const iceServers = await fetchIceServers();

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          } else {
            if (!remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = new MediaStream();
            }
            remoteVideoRef.current.srcObject.addTrack(event.track);
          }
          setCallStatus('Connected Live');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            recipientId: selectedChatUser._id || selectedChatUser.userId,
            candidate: event.candidate
          });
        }
      };

      if (isIncomingCall && incomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('video_call_answer', {
          recipientId: selectedChatUser._id || selectedChatUser.userId,
          answer
        });
        setCallStatus('Connected Live');
        await processIceQueue(); 
      } else {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('video_call_offer', {
          connectionId: selectedChatUser.connectionId,
          recipientId: selectedChatUser._id || selectedChatUser.userId,
          senderId: currentUserId,
          offer
        });
        setCallStatus('Ringing...');
      }

    } catch (err) {
      console.error("Could not gain access to media streams", err);
      setCallStatus('Media Permission Denied');
    }
  };

  const handleEndCall = () => {
    socket.emit('end_video_call', {
      recipientId: selectedChatUser._id || selectedChatUser.userId,
      senderId: currentUserId  
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
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-colors duration-200">
        
        <div className="p-4 bg-[var(--bg-header)] border-b border-[var(--border-color)] flex justify-between items-center transition-colors duration-200">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">Video Session with @{selectedChatUser.username}</h3>
            <p className="text-xs text-blue-500 font-medium mt-0.5">{callStatus}</p>
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