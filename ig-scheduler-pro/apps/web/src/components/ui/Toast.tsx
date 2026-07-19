import React from 'react';
import { useToastStore } from '../../stores/toastStore';

export const Toast: React.FC = () => {
  const { message, type, visible } = useToastStore();

  if (!visible) return null;

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md text-white shadow-lg transition-all duration-300 z-50 animate-bounce 
      ${type === 'success' ? 'bg-[#22a06b]' : type === 'error' ? 'bg-red-500' : 'bg-gray-800'}`}>
      {message}
    </div>
  );
};
