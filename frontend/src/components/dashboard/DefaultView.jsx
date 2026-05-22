import React from 'react';

export const DefaultView = ({ username, pendingInvitesCount, setRightView, fetchInvites }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
      <h1 className="text-3xl font-normal tracking-wide text-gray-100">
        Hello , <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{username}</span>
      </h1>
      
      <div className="flex space-x-4">
        <button 
          onClick={() => setRightView('send_request')}
          className="px-6 py-3 bg-[#1c1c22] border border-[#32323d] hover:border-blue-500 rounded-lg text-sm font-medium tracking-wide text-gray-300 hover:text-white hover:bg-[#22222c] shadow-lg transition transform duration-150 active:scale-95"
        >
          Send Requests
        </button>
        <button 
          onClick={() => { setRightView('accept_requests'); fetchInvites(); }}
          className="px-6 py-3 bg-[#1c1c22] border border-[#32323d] hover:border-emerald-500 rounded-lg text-sm font-medium tracking-wide text-gray-300 hover:text-white hover:bg-[#1c2822] shadow-lg transition transform duration-150 active:scale-95"
        >
          Accept Requests {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}
        </button>
      </div>
    </div>
  );
};