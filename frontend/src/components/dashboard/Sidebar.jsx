import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { deleteAccountAPI } from '../../services/api';

export const Sidebar = ({ user, activeConnections, selectedChatUser, onSelectChat, onRemoveConnection, onLogout, setRightView }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const dropdownRef = useRef(null);
  const { theme, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeToggleClick = () => {
    toggleTheme();
    toast.success(`Switched to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, {
      id: 'theme-toggle-toast',
    });
  };

  const triggerRemoveConfirmation = (conn) => {
    toast((t) => (
      <div className="flex flex-col space-y-3.5 p-1 text-left">
        <p className="text-sm font-medium leading-relaxed text-[var(--text-main)]">
          Remove connection with <span className="text-red-500 font-bold">@{conn.username}</span>? This will permanently wipe your chat records.
        </p>
        <div className="flex justify-end space-x-2.5 pt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onRemoveConnection(conn.connectionId);
            }}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    ), {
      duration: 8000,
      position: 'top-center',
      style: { minWidth: '300px', maxWidth: '420px', padding: '16px' }
    });
  };

  const triggerDeleteAccountConfirmation = () => {
    setShowDropdown(false);

    toast((t) => (
      <div className="flex flex-col space-y-3.5 p-1 text-left">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-red-500 tracking-wide">Delete Account</p>
        </div>
        <p className="text-sm text-[var(--text-main)] leading-relaxed">
          This will permanently delete your account <span className="font-bold">@{user?.username}</span>, all your connections, and all chat history.{' '}
          <span className="text-red-400 font-semibold">This cannot be undone.</span>
        </p>
        <div className="flex justify-end space-x-2.5 pt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              triggerFinalDeleteConfirmation();
            }}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md cursor-pointer"
          >
            Yes, delete it
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
      style: { minWidth: '320px', maxWidth: '440px', padding: '16px' }
    });
  };

  const triggerFinalDeleteConfirmation = () => {
    let inputValue = '';

    toast((t) => {
      const handleConfirm = async () => {
        if (inputValue.trim().toLowerCase() !== user?.username?.toLowerCase()) {
          toast.error('Username does not match. Deletion cancelled.');
          toast.dismiss(t.id);
          return;
        }
        toast.dismiss(t.id);
        await executeDeleteAccount();
      };

      return (
        <div className="flex flex-col space-y-3.5 p-1 text-left">
          <p className="text-sm font-bold text-red-500">Final Confirmation</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Type your username <span className="font-bold text-[var(--text-main)]">@{user?.username}</span> to confirm permanent deletion.
          </p>
          <input
            type="text"
            onChange={(e) => { inputValue = e.target.value; }}
            placeholder={user?.username}
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-main)] border border-red-500/40 text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500 transition-colors"
          />
          <div className="flex justify-end space-x-2.5 pt-1">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                toast('Account deletion cancelled.', { icon: '↩️' });
              }}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-md cursor-pointer"
            >
              Delete My Account
            </button>
          </div>
        </div>
      );
    }, {
      duration: 30000,
      position: 'top-center',
      style: { minWidth: '320px', maxWidth: '440px', padding: '16px' }
    });
  };

  const executeDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const loadingToastId = toast.loading('Deleting your account...');
    try {
      await deleteAccountAPI();
      toast.dismiss(loadingToastId);
      toast.success('Account deleted. Goodbye!', { duration: 3000 });
      setTimeout(() => { onLogout(); }, 1500);
    } catch (err) {
      toast.dismiss(loadingToastId);
      toast.error(err.response?.data?.message || 'Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="w-72 md:w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col h-full select-none transition-colors duration-200">

      <div className="px-4 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-header)] relative transition-colors duration-200 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold tracking-wide truncate text-[var(--text-main)]">
            @{user?.username}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={handleThemeToggleClick}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border-color)] transition duration-200 focus:outline-none flex items-center justify-center cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M6.343 6.344l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border-color)] transition duration-200 focus:outline-none cursor-pointer"
              title="Options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 py-1 overflow-hidden transition-colors duration-200">

                <button
                  onClick={() => {
                    setRightView('change_password');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-header)] hover:text-[var(--text-main)] flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Change Password</span>
                </button>

                <div className="border-t border-[var(--border-color)] my-1" />

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    toast.success('Logged out securely');
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 flex items-center space-x-2 transition cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout Account</span>
                </button>

                <div className="border-t border-red-500/20 my-1 mx-2" />

                <button
                  onClick={triggerDeleteAccountConfirmation}
                  disabled={isDeletingAccount}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center space-x-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{isDeletingAccount ? 'Deleting...' : 'Delete Account'}</span>
                </button>

              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5 bg-[var(--bg-card)] text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-[var(--border-color)] transition-colors duration-200 shrink-0">
        Active Connections
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[var(--bg-card)] transition-colors duration-200">
        {activeConnections.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-6">No active links found.</div>
        ) : (
          activeConnections.map((conn) => (
            <div
              key={conn.connectionId}
              className={`flex items-center justify-between p-1 rounded-lg border group transition duration-200 ${
                selectedChatUser?.connectionId === conn.connectionId
                  ? 'bg-[var(--bg-header)] border-blue-500/40 text-blue-500'
                  : 'bg-[var(--bg-sidebar)] border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-header)] hover:text-[var(--text-main)]'
              }`}
            >
              <button
                onClick={() => onSelectChat(conn)}
                className="flex-1 text-left p-2 text-sm font-medium tracking-wide truncate focus:outline-none cursor-pointer"
              >
                {conn.username}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerRemoveConfirmation(conn);
                }}
                className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-[var(--bg-main)] cursor-pointer shrink-0"
                title="Remove Connection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};