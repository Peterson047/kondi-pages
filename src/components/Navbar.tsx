import React from 'react';
import {
  Camera,
  History,
  Moon,
  Sun
} from 'lucide-react';
import { Logo } from './ui/Logo';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenHistory,
  historyCount,
  darkMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0A0A0C]/80 backdrop-blur-md transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Official Brand Logo */}
        <div className="flex items-center cursor-pointer">
          <Logo height={34} />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* History Button */}
          {historyCount > 0 && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-colors relative"
              title="Abrir histórico local"
            >
              <History className="w-4 h-4 text-zinc-500" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-500 text-white font-mono">
                {historyCount}
              </span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
            title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Primary Scan Button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-md shadow-orange-500/25 text-xs md:text-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Escanear</span>
          </button>
        </div>
      </div>
    </header>
  );
};
