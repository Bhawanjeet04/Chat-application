import React from 'react';

export const Sidebar = ({ user, activeConnections, selectedChatUser, onSelectChat, onLogout }) => {
  return (
    <div className="w-80 bg-[#18181c] border-r border-[#26262b] flex flex-col h-full">
      <div className="p-4.5 border-b border-[#26262b] flex items-center justify-between bg-[#1e1e24]">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide truncate max-w-[180px]">
            @{user?.username}
          </span>
        </div>
        <button 
          onClick={onLogout}
          className="text-xs text-gray-500 hover:text-red-400 font-medium bg-[#121214] px-2 py-1 rounded border border-[#26262b] transition"
        >
          Logout
        </button>
      </div>

      <div className="p-3 bg-[#141417] text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-[#26262b]">
        Active Connections
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#141417]">
        {activeConnections.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-6">No active links found.</div>
        ) : (
          activeConnections.map((conn) => (
            <button
              key={conn.connectionId}
              onClick={() => onSelectChat(conn)}
              className={`w-full text-left p-3 rounded-lg text-sm font-medium tracking-wide block transition truncate border ${
                selectedChatUser?.connectionId === conn.connectionId
                  ? 'bg-[#2b2b36] border-blue-500/40 text-blue-400'
                  : 'bg-[#1c1c22] border-transparent text-gray-400 hover:bg-[#22222a] hover:text-gray-200'
              }`}
            >
              {conn.username}
            </button>
          ))
        )}
      </div>
    </div>
  );
};