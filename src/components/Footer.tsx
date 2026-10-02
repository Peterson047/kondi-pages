import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 px-4 mt-16 text-xs text-zinc-500 dark:text-zinc-400 bg-white/40 dark:bg-black/20 transition-colors">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="space-y-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="font-bold text-zinc-900 dark:text-white">Kondi Pages</span>
            <span>•</span>
            <span className="font-mono">控计 (Controle e Gestão)</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Scanner e exportador de NFC-e 100% estático via GitHub Pages. Nenhum dado é enviado para servidores.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacidade Total
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            Feito com <Heart className="w-3 h-3 text-orange-500 fill-orange-500" /> no Brasil
          </span>
        </div>
      </div>
    </footer>
  );
};
