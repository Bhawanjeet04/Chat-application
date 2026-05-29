import { useState, useContext } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ThemeContext } from '../context/ThemeContext'; 

export const WelcomePage = () => {
  const [authMode, setAuthMode] = useState('welcome'); 
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useContext(ThemeContext); 

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-header)] shadow-md transition duration-200 focus:outline-none flex items-center justify-center cursor-pointer"
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
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl transition-colors duration-200">
        
        <div className="text-center space-y-3 flex flex-col items-center">
          <img 
            src="/chatlogo.svg" 
            alt="ChatApp Logo" 
            className="h-16 w-16 drop-shadow-md select-none pointer-events-none"
          />
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              ChatApp
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {authMode === 'register' ? 'Create an account to start chatting' : 'Connect instantly with real-time conversations'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
            <span className="font-medium">⚠️ {error}</span>
          </div>
        )}

        {authMode === 'welcome' && (
          <div className="flex flex-col space-y-3 pt-4">
            <button 
              onClick={() => { setAuthMode('login'); setError(''); }} 
              className="w-full py-3 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150 cursor-pointer shadow-md"
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setError(''); }} 
              className="w-full py-3 px-4 text-sm font-medium border border-[var(--border-color)] text-[var(--text-main)] bg-[var(--bg-main)] hover:bg-[var(--bg-header)] rounded-xl transition duration-150 cursor-pointer"
            >
              Create Account
            </button>
          </div>
        )}

        {authMode === 'login' && (
          <div className="space-y-6">
            <LoginForm onHandleError={setError} />
            <div className="text-center">
              <button 
                onClick={() => { setAuthMode('register'); setError(''); }} 
                className="text-sm font-medium text-blue-500 hover:text-blue-600 hover:underline transition cursor-pointer"
              >
                Don't have an account? Register
              </button>
            </div>
          </div>
        )}

        {authMode === 'register' && (
          <div className="space-y-6">
            <RegisterForm onHandleError={setError} />
            <div className="text-center">
              <button 
                onClick={() => { setAuthMode('login'); setError(''); }} 
                className="text-sm font-medium text-emerald-500 hover:text-emerald-600 hover:underline transition cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};