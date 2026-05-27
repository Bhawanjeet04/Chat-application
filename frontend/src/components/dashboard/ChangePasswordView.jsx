import React, { useState } from 'react';
import { changePasswordAPI } from '../../services/api';
import { GoArrowLeft } from "react-icons/go";
import { toast } from 'react-hot-toast';

export const ChangePasswordView = ({ onBack }) => {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) return;

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      const res = await changePasswordAPI({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      toast.success(res.data?.message || "Password updated successfully!");
      onBack(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-[var(--bg-panel)] transition-colors duration-200">
      <div className="flex items-center space-x-4 mb-6 border-b border-[var(--border-color)] pb-4 pl-3 gap-[40%] transition-colors duration-200">
        <button onClick={onBack} className="text-gray-500 text-2xl hover:text-[var(--text-main)] transition">
          <GoArrowLeft />
        </button>
        <h2 className="text-lg font-bold tracking-wide text-[var(--text-main)]">Account Security Setting</h2>
      </div>

      <div className="max-w-md w-full mx-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mt-10 shadow-xl flex flex-col space-y-6 transition-colors duration-200">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-1 tracking-wider uppercase">Update Password</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Ensure your account uses a complex string value sequence to remain protected.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Current Password</label>
              <input 
                type="password"
                name="currentPassword"
                placeholder="••••••••"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">New Password</label>
              <input 
                type="password"
                name="newPassword"
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Confirm New Password</label>
              <input 
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 font-medium rounded-lg text-sm tracking-wider text-white transition active:scale-[0.98]"
            >
              {loading ? 'Updating Security layers...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};