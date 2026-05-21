import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { WelcomePage } from '../pages/WelcomePage';

export const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/" element={!user ? <WelcomePage /> : <Navigate to="/dashboard" />} />
      <Route 
        path="/dashboard" 
        element={
          user ? (
            <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center justify-center">
              <div className="bg-white p-6 rounded-xl shadow-md text-center max-w-sm">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Chat Dashboard</h1>
                <p className="text-slate-600 mb-4">Welcome back, <span className="font-semibold text-blue-600">@{user.username}</span>!</p>
                <p className="text-xs text-slate-400">UI placeholder while your backend connection and socket channels finalize.</p>
              </div>
            </div>
          ) : (
            <Navigate to="/" />
          )
        } 
      />
    </Routes>
  );
};