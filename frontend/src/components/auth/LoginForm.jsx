import { useState, useContext } from 'react';
import { loginAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { toast } from 'react-hot-toast';

export const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginAPI({ username, password });
      toast.success(`Welcome back, @${username}!`);
      login(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid username or password.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      
      <button 
        type="submit" 
        className="w-full py-3 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 transform active:scale-[0.98] cursor-pointer"
      >
        Sign In
      </button>
    </form>
  );
};