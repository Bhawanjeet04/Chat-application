import { useState } from 'react';

export const SendRequestView = ({ username, onBack, onSendRequest }) => {
  const [searchUsername, setSearchUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    onSendRequest(searchUsername.trim(), () => setSearchUsername(''));
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center space-x-4 mb-6 border-b border-[#26262b] pb-4">
        <button onClick={onBack} className="text-gray-500 hover:text-white transition text-sm">⬅ Back</button>
        <h2 className="text-lg font-bold tracking-wide">Hello , {username}</h2>
      </div>

      <div className="max-w-md w-full mx-auto bg-[#141417] border border-[#26262b] rounded-xl p-6 mt-10 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 tracking-wider uppercase">Search Connection Identity</h3>
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
    </div>
  );
};