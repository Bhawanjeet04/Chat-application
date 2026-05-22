import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { WelcomePage } from '../pages/WelcomePage';
import { DashboardPage } from '../pages/DashboardPage'; 

export const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>

      <Route path="/" element={!user ? <WelcomePage /> : <Navigate to="/dashboard" />} />
      

      <Route 
        path="/dashboard" 
        element={user ? <DashboardPage /> : <Navigate to="/" />} 
      />
    </Routes>
  );
};