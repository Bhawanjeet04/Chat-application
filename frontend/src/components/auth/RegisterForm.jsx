import { useState, useContext } from 'react';
import { registerAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Input } from '../common/Input';

export const RegisterForm = ({ onHandleError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await registerAPI({ username, password });
      login(response.data);
    } catch (err) {
      onHandleError(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a unique username" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" />
      
      <button 
        type="submit" 
        className="w-full py-3 px-4 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-lg shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-150 transform active:scale-[0.98]"
      >
        Create Account
      </button>
    </form>
  );
};