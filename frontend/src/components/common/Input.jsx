import React from "react";

export const Input = ({ label, type = 'text', value, onChange, placeholder, required = true }) => {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      <label className="text-sm font-semibold text-gray-700 tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 placeholder-gray-400"
      />
    </div>
  );
};