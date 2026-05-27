import { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import {
  sendRequestAPI,
  getPendingRequestsAPI,
  respondToRequestAPI,
  getChatHistoryAPI,
  getAcceptedConnectionsAPI,
  removeConnectionAPI
} from '../services/api';
import axios from 'axios'; 
import { VideoCallModal } from '../components/dashboard/VideoCallModal';
import { Sidebar } from '../components/dashboard/Sidebar';
import { DefaultView } from '../components/dashboard/DefaultView';
import { SendRequestView } from '../components/dashboard/SendRequestView';
import { AcceptRequestsView } from '../components/dashboard/AcceptRequestsView';
import { ChatView } from '../components/dashboard/ChatView';

export const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [rightView, setRightView] = useState('default'); 
  const [sentRequests, setSentRequests] = useState([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [activeIncomingOffer, setActiveIncomingOffer] = useState(null);
  const [preserveHistory, setPreserveHistory] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statusText, setStatusText] = useState({ msg: '', isError: false });
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  const fetchSidebarConnections = async () => {
    try {
      const res = await getAcceptedConnectionsAPI();
      setActiveConnections(res.data);
    } catch (err) {
      console.error("Failed to load authorized connections", err);
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    try {
      await removeConnectionAPI(connectionId);
      setActiveConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
      if (selectedChatUser?.connectionId === connectionId) {
        setSelectedChatUser(null);
      }
    } catch (err) {
      console.error("Removal failure:", err);
      alert(err.response?.data?.message || "Failed to remove this connection.");
    }
  };

  const formatLastSeen = (dateString) => {
  if (!dateString) return 'Offline';
  
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now - past;
  
  const mins = Math.floor(diffInMs / 1000 / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

  const fetchInvites = async () => {
    try {
      const res = await getPendingRequestsAPI();
      setPendingInvites(res.data);
    } catch (err) {
      console.error("Failed loading requests", err);
    }
  };

  const fetchSentRequests = async () => {
  try {
    const res = await getSentRequestsAPI();
    setSentRequests(res.data);
  } catch (err) {
    console.error("Failed loading sent requests tracking:", err);
  }
};



  useEffect(() => {
    if (!socket) return;

    socket.on('video_call_offer_received', (data) => {
      const isValidFriend = activeConnections.some(conn => conn.userId === data.senderId);
      
      if (isValidFriend) {
        const companion = activeConnections.find(conn => conn.userId === data.senderId);
        setSelectedChatUser({
          _id: companion.userId,
          username: companion.username,
          connectionId: companion.connectionId
        });
        setActiveIncomingOffer(data.offer);
        setIsIncomingCall(true);
        setShowVideoModal(true);
      }
    });

    return () => socket.off('video_call_offer_received');
  }, [socket, activeConnections]);

  useEffect(() => {
    if (user) {
      fetchSidebarConnections();
      fetchInvites();
      fetchSentRequests();
    }
  }, [user]);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', { withCredentials: true });
    setSocket(newSocket);

    if (user) {
      newSocket.emit('register_user', user.id);
    }

    newSocket.on('new_connection_request', (data) => {
      triggerNotification(data.message, false);
      fetchInvites();
    });


    newSocket.on('preserve_toggle_updated', (data) => {
      if (selectedChatUser && selectedChatUser.connectionId === data.connectionId) {
        setPreserveHistory(data.preserveHistory);
      }
      
      setActiveConnections(prev => prev.map(conn => 
        conn.connectionId === data.connectionId 
          ? { ...conn, preserveHistory: data.preserveHistory } 
          : conn
      ));
    });

    newSocket.on('connection_accepted', (newFriend) => {
      setActiveConnections((prev) => {
        if (prev.some(conn => conn.connectionId === newFriend.connectionId)) return prev;
        return [...prev, newFriend];
      });
      fetchSentRequests();
      triggerNotification(`You are now connected with @${newFriend.username}!`, false);
    });

    newSocket.on('receive_message', (msgPayload) => {
      setSelectedChatUser((currentSelected) => {
        if (currentSelected && msgPayload.connectionId === currentSelected.connectionId) {
          
          setMessages((prev) => {
            const isAlreadyRendered = prev.some(
              (msg) => msg.text === msgPayload.text && 
                       msg.sender === msgPayload.sender &&
                       Math.abs(new Date(msg.createdAt) - new Date(msgPayload.createdAt)) < 2000 
            );

            if (isAlreadyRendered) {
              return prev;
            }
            
            return [...prev, msgPayload]; 
          });
        }
        return currentSelected;
      });
    });


    newSocket.on('connection_removed', ({ connectionId }) => {
      newSocket.on('get_online_users', (userIdsList) => {
      setOnlineUserIds(userIdsList);
    });
      setActiveConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
      setSelectedChatUser((currentSelected) => {
        if (currentSelected?.connectionId === connectionId) {
          setRightView('default');
          return null;
        }
        return currentSelected;
      });
    });

    return () => {
      newSocket.off('new_connection_request');
      newSocket.off('connection_accepted');
      newSocket.off('receive_message');
      newSocket.off('connection_removed');
      newSocket.disconnect();
    };
  }, [user, selectedChatUser]);

  

  const triggerNotification = (msg, isError = false) => {
    setStatusText({ msg, isError });
    setTimeout(() => setStatusText({ msg: '', isError: false }), 4000);
  };

  const handleSendRequest = async (targetUsername, successCallback) => {
    try {
      const res = await sendRequestAPI(targetUsername);
      triggerNotification(res.data.message, false);

      if (socket && res.data.connection) {
        socket.emit('send_connection_request', {
          senderUsername: user.username,
          recipientId: res.data.connection.recipient
        });
      }
      successCallback();
    } catch (err) {
      triggerNotification(err.response?.data?.message || "User not found", true);
    }
  };

  const handleRespondToInvite = async (requestId, action) => {
    try {
      await respondToRequestAPI(requestId, action);
      triggerNotification(`Request ${action} successfully!`, false);

      setPendingInvites((prevInvites) => 
        prevInvites.filter((invite) => invite._id !== requestId)
      );

      if (action === 'accepted') {
        fetchSidebarConnections(); 
      }
    } 
    catch (err) {
      triggerNotification("Failed executing response action", true);
    }
  };

  const handleSelectChat = async (conn) => {
    setSelectedChatUser({ _id: conn.userId, userId: conn.userId, username: conn.username, connectionId: conn.connectionId, lastSeen: conn.lastSeen });
    setPreserveHistory(conn.preserveHistory || false);
    setRightView('chat');
    
    try {
      const res = await getChatHistoryAPI(conn.connectionId);
      setMessages(res.data);
    } catch (err) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!selectedChatUser) return;

    const payload = {
      connectionId: selectedChatUser.connectionId,
      recipientId: selectedChatUser._id,
      sender: user.id,
      text: messageText,
      createdAt: new Date()
    };

    socket.emit('send_message', payload);
    setMessages((prev) => [...prev, payload]);

    try {
      await axios.post('http://localhost:5000/api/chats/message', {
        connectionId: selectedChatUser.connectionId,
        text: messageText
      }, { withCredentials: true }); 
    } catch (err) {
      console.error("Message backup pipeline failed processing:", err.response?.data || err.message);
    }
  };

  const handleToggleHistory = async (newState) => {
    if (!selectedChatUser) return;
    try {
      await axios.put(`http://localhost:5000/api/chats/toggle-preserve/${selectedChatUser.connectionId}`, {
        preserveHistory: newState
      }, { withCredentials: true });

      setPreserveHistory(newState);

      setActiveConnections(prev => prev.map(conn => 
        conn.connectionId === selectedChatUser.connectionId 
          ? { ...conn, preserveHistory: newState } 
          : conn
      ));

      socket.emit('update_preserve_toggle', {
        recipientId: selectedChatUser._id,
        connectionId: selectedChatUser.connectionId,
        preserveHistory: newState
      });

      triggerNotification(`Chat history retention turned ${newState ? 'ON' : 'OFF'}.`, false);
    } catch (err) {
      console.error("Toggle error:", err.response?.data || err.message);
      triggerNotification("Failed to update privacy configuration context state.", true);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#121214] text-gray-200 overflow-hidden font-sans select-none antialiased">
      {statusText.msg && (
        <div className={`absolute top-4 right-[-8%] -translate-x-1/2 px-4 py-2 rounded-md shadow-xl text-xs font-semibold z-50 border ${statusText.isError ? 'bg-red-950 border-red-800 text-red-200' : 'bg-blue-950 border-blue-800 text-blue-200'
          }`}>
          {statusText.msg}
        </div>
      )}

      {showVideoModal && selectedChatUser && (
        <VideoCallModal 
          socket={socket}
          selectedChatUser={selectedChatUser}
          currentUserId={user?.id}
          isIncomingCall={isIncomingCall}
          incomingOffer={activeIncomingOffer}
          onClose={() => {
            setShowVideoModal(false);
            setIsIncomingCall(false);
            setActiveIncomingOffer(null);
          }}
        />
      )}

      <Sidebar 
        user={user}
        activeConnections={activeConnections}
        selectedChatUser={selectedChatUser}
        onSelectChat={handleSelectChat}
        onRemoveConnection={handleRemoveConnection} 
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col bg-[#0f0f11] relative">
        {rightView === 'default' && (
          <DefaultView
            username={user?.username}
            pendingInvitesCount={pendingInvites.length}
            setRightView={setRightView}
            fetchInvites={fetchInvites}
          />
        )}

        {rightView === 'send_request' && (
          <SendRequestView
            username={user?.username}
            sentRequests={sentRequests}
            onRefreshSentRequests={fetchSentRequests}
            onBack={() => setRightView('default')}
            onSendRequest={handleSendRequest}
          />
        )}

        {rightView === 'accept_requests' && (
          <AcceptRequestsView
            username={user?.username}
            pendingInvites={pendingInvites}
            onBack={() => setRightView('default')}
            onRespond={handleRespondToInvite}
          />
        )}

{rightView === 'chat' && selectedChatUser && (
          <ChatView
            selectedChatUser={selectedChatUser}
            messages={messages}
            currentUserId={user?.id}
            onSendMessage={handleSendMessage}
            triggerVideoCallNotice={() => {
              setIsIncomingCall(false);
              setActiveIncomingOffer(null);
              setShowVideoModal(true);
            }}
            preserveHistory={preserveHistory}
            onToggleHistory={handleToggleHistory}
            onBack={() => setRightView('default')}
            
            statusSubtext={formatLastSeen(selectedChatUser.lastSeen)}
          />
        )}
      </div>
    </div>
  );
};