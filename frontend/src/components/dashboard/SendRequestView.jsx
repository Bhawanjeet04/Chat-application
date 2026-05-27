import { useState, useEffect } from 'react';
import { getSentRequestsAPI } from "../../services/api";
import { GoArrowLeft } from "react-icons/go";
import { toast } from 'react-hot-toast';

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
    <div className="flex-1 flex flex-col p-6 bg-[var(--bg-panel)] transition-colors duration-200">
      <div className="flex items-center space-x-4 mb-6 border-b border-[var(--border-color)] pb-4 gap-[40%] pl-3 transition-colors duration-200">
        <button onClick={onBack} className="text-gray-500 text-2xl hover:text-[var(--text-main)] transition">
          <GoArrowLeft />
        </button>
        <h2 className="text-lg font-bold tracking-wide text-[var(--text-main)]">Hello, {username}</h2>
      </div>

      <div className="max-w-md w-full mx-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mt-10 shadow-xl flex flex-col space-y-6 transition-colors duration-200">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-4 tracking-wider uppercase text-center transition-colors">
            Search for User
          </h3>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input 
              type="text"
              placeholder="search_username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
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
          <div className="border-t border-[var(--border-color)] pt-4 transition-colors">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 transition-colors">
              Sent Pending Requests
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {sentRequests.map((req) => (
                <div 
                  key={req._id} 
                  className="flex justify-between items-center bg-[var(--bg-header)] p-3 rounded-lg border border-[var(--border-color)] transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-[var(--text-main)]">
                    {req.recipient?.username || 'Unknown User'}
                  </span>
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20 font-semibold uppercase tracking-wider select-none">
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