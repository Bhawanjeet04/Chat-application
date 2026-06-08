import { useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import {
  sendRequestAPI,
  getPendingRequestsAPI,
  respondToRequestAPI,
  getChatHistoryAPI,
  getAcceptedConnectionsAPI,
  removeConnectionAPI,
  getSentRequestsAPI
} from '../services/api';
import axios from 'axios';
import { VideoCallModal } from '../components/dashboard/VideoCallModal';
import { Sidebar } from '../components/dashboard/Sidebar';
import { DefaultView } from '../components/dashboard/DefaultView';
import { SendRequestView } from '../components/dashboard/SendRequestView';
import { AcceptRequestsView } from '../components/dashboard/AcceptRequestsView';
import { ChatView } from '../components/dashboard/ChatView';
import { ChangePasswordView } from '../components/dashboard/ChangePasswordView';
import { toast } from 'react-hot-toast';

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
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        setRightView('default');
      }
      toast.success('Connection removed.');
    } catch (err) {
      console.error("Removal failure:", err);
      toast.error(err.response?.data?.message || "Failed to remove this connection.");
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

    socket.on('incoming-call', ({ signal, callerId, name }) => {
      const isValidFriend = activeConnections.some(conn => conn.userId === callerId);
      if (!isValidFriend) return;

      const companion = activeConnections.find(conn => conn.userId === callerId);

      setSelectedChatUser({
        _id: companion.userId,
        userId: companion.userId,
        username: companion.username,
        connectionId: companion.connectionId,
        lastSeen: companion.lastSeen
      });

      setActiveIncomingOffer({ signal, callerId, name });
      setIsIncomingCall(true);
      setShowVideoModal(true);
      toast(`📞 Incoming call from @${companion.username}`, { duration: 6000 });
    });

    return () => socket.off('incoming-call');
  }, [socket, activeConnections]);

  useEffect(() => {
    if (user) {
      fetchSidebarConnections();
      fetchInvites();
      fetchSentRequests();
    }
  }, [user]);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');
    setSocket(newSocket);

    if (user) {
      newSocket.emit('register_user', user.id);
    }

    newSocket.on('new_connection_request', (data) => {
      toast(data.message || 'New invite request received!', { icon: '🔔' });
      fetchInvites();
    });

    newSocket.on('preserve_toggle_updated', (data) => {
      setPreserveHistory(data.preserveHistory);
      
      setSelectedChatUser((currentSelected) => {
        if (currentSelected && currentSelected.connectionId === data.connectionId) {
          return { ...currentSelected, preserveHistory: data.preserveHistory };
        }
        return currentSelected;
      });

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
      toast.success(`You are now connected with @${newFriend.username}!`);
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
            if (isAlreadyRendered) return prev;
            return [...prev, msgPayload];
          });
        }
        return currentSelected;
      });
    });

    newSocket.on('get_online_users', (userIdsList) => {
      setOnlineUserIds(userIdsList);
    });

    newSocket.on('connection_removed', ({ connectionId }) => {
      setActiveConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
      setSelectedChatUser((currentSelected) => {
        if (currentSelected?.connectionId === connectionId) {
          setRightView('default');
          toast('Connection removed.', { icon: '⚠️' });
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
      newSocket.off('get_online_users');
      newSocket.off('preserve_toggle_updated');
      newSocket.disconnect();
    };
  }, [user]);

  const handleSendRequest = async (targetUsername, successCallback) => {
    try {
      const res = await sendRequestAPI(targetUsername);
      toast.success(res.data.message || 'Invitation request sent successfully!');
      if (socket && res.data.connection) {
        socket.emit('send_connection_request', {
          senderUsername: user.username,
          recipientId: res.data.connection.recipient
        });
      }
      successCallback();
    } catch (err) {
      toast.error(err.response?.data?.message || "User not found");
    }
  };

  const handleRespondToInvite = async (requestId, action) => {
    try {
      await respondToRequestAPI(requestId, action);
      toast.success(`Request ${action} successfully!`);
      setPendingInvites((prevInvites) =>
        prevInvites.filter((invite) => invite._id !== requestId)
      );
      if (action === 'accepted') {
        fetchSidebarConnections();
      }
    } catch (err) {
      toast.error("Failed executing response action");
    }
  };

  const handleSelectChat = async (conn) => {
    const currentPreserveState = conn.preserveHistory || false;
    setSelectedChatUser({ 
      _id: conn.userId, 
      userId: conn.userId, 
      username: conn.username, 
      connectionId: conn.connectionId, 
      lastSeen: conn.lastSeen,
      preserveHistory: currentPreserveState
    });
    setPreserveHistory(currentPreserveState);
    setRightView('chat');
    setSidebarOpen(false);

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
      const serverBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.post(`${serverBase}/api/chats/message`, {
        connectionId: selectedChatUser.connectionId,
        text: messageText
      }, { withCredentials: true });
    } catch (err) {
      console.error("Message backup failed processing:", err.response?.data || err.message);
    }
  };

  const handleToggleHistory = async (newState) => {
    if (!selectedChatUser) return;
    try {
      const serverBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await axios.put(`${serverBase}/api/chats/toggle-preserve/${selectedChatUser.connectionId}`, {
        preserveHistory: newState
      }, { withCredentials: true });

      setPreserveHistory(newState);
      
      setSelectedChatUser((currentSelected) => {
        if (currentSelected && currentSelected.connectionId === selectedChatUser.connectionId) {
          return { ...currentSelected, preserveHistory: newState };
        }
        return currentSelected;
      });

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
      toast.success(`Chat history retention turned ${newState ? 'ON' : 'OFF'}.`);
    } catch (err) {
      console.error("Toggle error:", err.response?.data || err.message);
      toast.error("Failed to update privacy configuration.");
    }
  };

  const handleChatBack = () => {
    setRightView('default');
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans select-none antialiased transition-colors duration-200">
      {showVideoModal && selectedChatUser && (
        <VideoCallModal
          socket={socket}
          selectedChatUser={selectedChatUser}
          currentUserId={user?.id}
          incomingCall={isIncomingCall ? activeIncomingOffer : null}
          onClose={() => {
            setShowVideoModal(false);
            setIsIncomingCall(false);
            setActiveIncomingOffer(null);
          }}
        />
      )}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed md:relative z-40 md:z-auto
        h-full
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <Sidebar
          user={user}
          activeConnections={activeConnections}
          selectedChatUser={selectedChatUser}
          onSelectChat={handleSelectChat}
          onRemoveConnection={handleRemoveConnection}
          onLogout={logout}
          setRightView={(view) => {
            setRightView(view);
            setSidebarOpen(false);
          }}
        />
      </div>

      <div className="flex-1 flex flex-col bg-[var(--bg-panel)] relative min-w-0 transition-colors duration-200">
        <div className={`flex items-center md:hidden px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-color)] shrink-0 transition-colors duration-200 ${
          rightView === 'chat' ? 'hidden' : ''
        }`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border-color)] transition mr-3 cursor-pointer"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-wide text-[var(--text-main)]">
            {rightView === 'send_request' ? 'Send Request'
              : rightView === 'accept_requests' ? 'Accept Requests'
              : rightView === 'change_password' ? 'Change Password'
              : 'ChatApp'}
          </span>
        </div>

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
            socket={socket}
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
            onBack={handleChatBack}
            isOnline={onlineUserIds.includes(selectedChatUser?._id?.toString()) || onlineUserIds.includes(selectedChatUser?.userId?.toString())}
            statusSubtext={formatLastSeen(selectedChatUser.lastSeen)}
          />
        )}

        {rightView === 'change_password' && (
          <ChangePasswordView
            onBack={() => setRightView('default')}
          />
        )}
      </div>
    </div>
  );
};