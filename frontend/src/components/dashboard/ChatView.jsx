import { useState, useEffect, useRef } from 'react';
import { GoArrowLeft } from "react-icons/go";

export const ChatView = ({
  selectedChatUser,
  messages,
  currentUserId,
  onSendMessage,
  triggerVideoCallNotice,
  preserveHistory,
  onToggleHistory,
  isOnline,
  statusSubtext,
  onBack
}) => {
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
    <div className="flex flex-col h-full w-full max-h-screen bg-[var(--bg-panel)] overflow-hidden">
      <div className="px-3 py-3 sm:p-4 bg-[var(--bg-header)] border-b border-[var(--border-color)] flex items-center justify-between gap-2 transition-colors duration-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="text-gray-500 text-2xl hover:text-[var(--text-main)] transition shrink-0 cursor-pointer">
            <GoArrowLeft />
          </button>

          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-bold text-[var(--text-main)] tracking-wide truncate">
              {selectedChatUser.username}
            </h2>
            <span className={`text-[11px] font-medium tracking-wide transition-colors ${
              isOnline ? 'text-green-500' : 'text-[var(--text-muted)]'
            }`}>
              {isOnline ? '● Online' : `Last seen: ${statusSubtext}`}
            </span>
          </div>
        </div>  

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onToggleHistory(!preserveHistory)}
            className={`px-2 sm:px-3 py-1.5 border rounded text-[10px] sm:text-xs font-medium transition active:scale-95 flex items-center gap-1 cursor-pointer ${
              preserveHistory
                ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 hover:bg-blue-600/20'
                : 'bg-[var(--bg-sidebar)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${preserveHistory ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}></span>
            <span>{preserveHistory ? 'History: On' : 'History: Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerVideoCallNotice(selectedChatUser)}
            className="px-2 sm:px-3 py-1.5 bg-[var(--bg-sidebar)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] rounded text-[10px] sm:text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>📹</span>
            <span>Video Call</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--bg-panel)] min-h-0 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)] italic">
            Write a message to start the conversation.
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSentByMe = msg.sender === currentUserId;
            return (
              <div key={index} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm border transition-colors duration-150 ${
                  isSentByMe
                    ? 'bg-[var(--bg-bubble-self)] border-blue-500/10 text-white rounded-tr-none'
                    : 'bg-[var(--bg-bubble-other)] border-[var(--border-color)] text-[var(--text-main)] rounded-tl-none'
                }`}>
                  <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <div className="p-3 sm:p-4 bg-[var(--bg-header)] border-t border-[var(--border-color)] transition-colors duration-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-2 max-w-5xl mx-auto">
          <input
            type="text"
            placeholder="write the message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
            required
          />
          <button
            type="submit"
            className="px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold tracking-wide rounded-lg text-sm text-white transition active:scale-95 shrink-0 cursor-pointer"
          >
            send
          </button>
        </form>
      </div>
    </div>
  );
};