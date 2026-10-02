import React from 'react';
import {
  Camera,
  History,
  Moon,
  Sun,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenHistory: () => void;
  onLoadDemo: () => void;
  historyCount: number;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenHistory,
  onLoadDemo,
  historyCount,
  darkMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0A0A0C]/80 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onLoadDemo}>
          <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 font-black text-lg">
            K
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-zinc-900 dark:text-white tracking-tight">
                Kondi
              </span>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-800/60 uppercase">
                Pages
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono -mt-1 hidden sm:block">
              控计 • Nota Fiscal Paulista
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Load Demo Button */}
          <button
            onClick={onLoadDemo}
            title="Ver recibo de exemplo do Design System"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-xl transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-900"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Recibo Exemplo
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition-colors relative"
            title="Abrir histórico local"
          >
            <History className="w-4 h-4 text-zinc-500" />
            <span className="hidden sm:inline">Histórico</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-500 text-white font-mono">
                {historyCount}
              </span>
            )}
          </button>

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
