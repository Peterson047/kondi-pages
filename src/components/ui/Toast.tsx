import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900/95 dark:bg-zinc-800/95 text-white rounded-2xl shadow-xl backdrop-blur-md border border-zinc-700/50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
      {type === 'info' && <Info className="w-5 h-5 text-orange-400 shrink-0" />}
      <span className="text-sm font-medium pr-1">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
