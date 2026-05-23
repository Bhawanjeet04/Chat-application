import { useState, useEffect, useRef } from 'react';

export const ChatView = ({ selectedChatUser, messages, currentUserId, onSendMessage, triggerVideoCallNotice ,preserveHistory,onToggleHistory, isOnline, statusSubtext}) => {
  const [newMessage, setNewMessage] = useState('');
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      <div className="p-4 bg-[#141417] border-b border-[#26262b] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-200 tracking-wide">{selectedChatUser.username}</h2>
          <span className={`text-[11px] font-medium tracking-wide ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
        {isOnline ? '● Online' : `Last seen: ${statusSubtext}`}
      </span>
        </div>
<div className="flex items-center space-x-3">
          <button
            onClick={() => onToggleHistory(!preserveHistory)}
            className={`px-3 py-1.5 border rounded text-xs font-medium transition active:scale-95 flex items-center space-x-1.5 ${
              preserveHistory 
                ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 hover:bg-blue-600/20' 
                : 'bg-[#1c1c22] border-[#32323d] text-gray-400 hover:text-white hover:bg-[#25252e]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${preserveHistory ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`}></span>
            <span>{preserveHistory ? 'History: On' : 'History: Off'}</span>
          </button>

          <button 
            onClick={triggerVideoCallNotice}
            className="px-3 py-1.5 bg-[#1c1c22] hover:bg-[#25252e] border border-[#32323d] rounded text-xs font-medium text-gray-300 hover:text-white transition active:scale-95"
          >
            video call
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c0c0e]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-600 italic">
            Write a message to start the conversation.
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSentByMe = msg.sender === currentUserId;
            return (
              <div key={index} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm border ${
                  isSentByMe 
                    ? 'bg-[#2b2b3d] border-blue-500/20 text-gray-100 rounded-tr-none' 
                    : 'bg-[#18181c] border-[#26262b] text-gray-300 rounded-tl-none'
                }`}>
                  <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <div className="p-4 bg-[#141417] border-t border-[#26262b]">
        <form onSubmit={handleSubmit} className="flex space-x-2 max-w-5xl mx-auto">
          <input 
            type="text"
            placeholder="write the message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#1c1c22] border border-[#2b2b33] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
            required
          />
          <button 
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold tracking-wide rounded-lg text-sm text-white transition active:scale-95"
          >
            send
          </button>
        </form>
      </div>
    </div>
  );
};