import { useState, useEffect } from 'react';
import { getSentRequestsAPI } from "../../services/api";
import { GoArrowLeft } from "react-icons/go";

export const SendRequestView = ({ username, onBack, onSendRequest, socket }) => {
  const [searchUsername, setSearchUsername] = useState('');
  const [sentRequests, setSentRequests] = useState([]);

  const fetchSentRequests = async () => {
    try {
      const res = await getSentRequestsAPI();
      setSentRequests(res.data);
    } catch (err) {
      console.error("Failed to load sent requests tracking records:", err);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConnectionAccepted = (data) => {
      console.log("A sent connection request was accepted:", data);
            setSentRequests((prevRequests) => 
        prevRequests.filter((req) => req._id !== data.connectionId)
      );
    };

    socket.on('connection_accepted', handleConnectionAccepted);

    return () => {
      socket.off('connection_accepted', handleConnectionAccepted);
    };
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    
    onSendRequest(searchUsername.trim(), () => {
      setSearchUsername('');
      fetchSentRequests(); 
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center space-x-4 mb-6 border-b border-[#26262b] pb-4 gap-[40%]">
        <button onClick={onBack} className="text-gray-500 text-2xl hover:text-white transition"><GoArrowLeft /></button>
        <h2 className="text-lg font-bold tracking-wide">Hello, {username}</h2>
      </div>

      <div className="max-w-md w-full mx-auto bg-[#141417] border border-[#26262b] rounded-xl p-6 mt-10 shadow-xl flex flex-col space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-4 tracking-wider uppercase text-center">Search for User</h3>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input 
              type="text"
              placeholder="search_username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#1e1e24] border border-[#2d2d35] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
            <button 
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm tracking-wider text-white transition active:scale-95"
            >
              invite
            </button>
          </form>
        </div>

        {sentRequests.length > 0 && (
          <div className="border-t border-[#26262b] pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Sent Pending Requests
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {sentRequests.map((req) => (
                <div 
                  key={req._id} 
                  className="flex justify-between items-center bg-[#1a1a1f] p-3 rounded-lg border border-[#26262b]"
                >
                  <span className="text-sm font-medium text-gray-300">
                    {req.recipient?.username || 'Unknown User'}
                  </span>
                  <span className="text-[10px] bg-yellow-950/40 text-yellow-500 px-2 py-0.5 rounded border border-yellow-800/30 font-semibold uppercase tracking-wider select-none">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};