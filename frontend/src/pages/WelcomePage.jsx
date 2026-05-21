import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

export const WelcomePage = () => {
  const [authMode, setAuthMode] = useState('welcome'); 
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl border border-slate-100 transition-all duration-300">
        

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ChatApp
          </h1>
          <p className="text-sm text-slate-500">
            {authMode === 'register' ? 'Create an account to start chatting' : 'Connect instantly with real-time conversations'}
          </p>
        </div>


        {error && (
          <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2">
            <span className="font-medium">⚠️ {error}</span>
          </div>
        )}

        {authMode === 'welcome' && (
          <div className="flex flex-col space-y-3 pt-4">
            <button 
              onClick={() => { setAuthMode('login'); setError(''); }} 
              className="w-full py-3 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition duration-150"
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setError(''); }} 
              className="w-full py-3 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-150"
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
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
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
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition"
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