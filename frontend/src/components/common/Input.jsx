import React from 'react';

export const Input = ({ label, type = 'text', value, onChange, placeholder, required = true }) => {
  return (
    <div className="space-y-2 flex flex-col text-left">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors duration-200"
      />
    </div>
  );
};