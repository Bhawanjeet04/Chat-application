import React from 'react';

export const DefaultView = ({ username, pendingInvitesCount, setRightView, fetchInvites }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-[var(--bg-panel)] transition-colors duration-200">
      <h1 className="text-3xl font-normal tracking-wide text-(--text-main)">
        Hello , <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">{username}</span>
      </h1>
      
      <div className="flex space-x-4">
        <button 
          type="button"
          onClick={() => setRightView('send_request')}
          className="px-6 py-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] hover:border-blue-500 rounded-lg text-sm font-medium tracking-wide text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] shadow-lg transition transform duration-150 active:scale-95 cursor-pointer"
        >
          Send Requests
        </button>

        <button 
          type="button"
          onClick={() => { setRightView('accept_requests'); fetchInvites(); }}
          className="px-6 py-3 rounded-lg text-sm font-medium tracking-wide shadow-lg transition transform duration-150 active:scale-95 cursor-pointer border
            bg-[var(--bg-sidebar)] border-[var(--border-color)] text-[var(--text-muted)]
            hover:text-emerald-600 dark:hover:text-emerald-400 
            hover:border-emerald-500
            light:hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          Accept Requests {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}
        </button>
      </div>
    </div>
  );
};