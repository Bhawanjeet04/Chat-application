import React from 'react';
import { GoArrowLeft } from "react-icons/go";


export const AcceptRequestsView = ({ username, pendingInvites, onBack, onRespond }) => {
  return (
    <div className="flex-1 flex flex-col p-6 ">
      <div className="flex items-center space-x-4 mb-6 border-b border-[#26262b] pb-4 pl-3 gap-[40%]">
        <button onClick={onBack} className="text-gray-500 text-2xl hover:text-white transition"><GoArrowLeft /></button>
        <h2 className="text-lg font-bold tracking-wide">Hello , {username}</h2>
      </div>

      <div className="max-w-lg w-full mx-auto bg-[#141417] border border-[#26262b] rounded-xl p-6 shadow-xl flex flex-col">
        <div className="text-center text-sm font-semibold text-gray-400 border-b border-[#26262b] pb-3 mb-4 tracking-wider uppercase">
          Invites
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
          {pendingInvites.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-8 italic">No pending requests.</div>
          ) : (
            pendingInvites.map((req) => (
              <div key={req._id} className="flex items-center justify-between p-3 bg-[#1e1e24] border border-[#2d2d35] rounded-lg">
                <span className="text-sm font-medium text-gray-300">
                  {req.sender?.username}
                </span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => onRespond(req._id, 'accepted')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold tracking-wide transition active:scale-95"
                  >
                    accept
                  </button>
                  <button 
                    onClick={() => onRespond(req._id, 'declined')}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 border border-red-500/20 text-red-200 hover:text-white rounded text-xs font-semibold tracking-wide transition active:scale-95"
                  >
                    reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};