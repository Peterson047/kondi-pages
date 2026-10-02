import React, { useState } from 'react';
import { X, FileCode, Sparkles, AlertCircle } from 'lucide-react';
import { parseNfceHtml } from '../../lib/nfce-parser';
import { NfceData } from '../../lib/types';

interface ManualHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: NfceData) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ManualHtmlModal: React.FC<ManualHtmlModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!htmlInput.trim()) {
      setError('Por favor, cole o código HTML da página da NFC-e.');
      return;
    }

    try {
      const data = parseNfceHtml(htmlInput, urlInput.trim() || undefined);

      if (data.items.length === 0 && data.total === 0 && data.store === 'Estabelecimento Comercial') {
        setError('Não foi possível identificar itens ou dados fiscais no texto colado. Verifique se copiou a página inteira da consulta da SEFAZ.');
        return;
      }

      onSuccess(data);
      onShowToast('Nota Fiscal processada com sucesso!', 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erro ao interpretar dados: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#141416] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Importar Código da Página</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Alternativa sem bloqueios para ler a NFC-e
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleParse} className="p-6 space-y-4 overflow-y-auto">
          {/* Quick instructions */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
            <span className="font-bold block text-zinc-900 dark:text-white">
              Como funciona em 3 passos:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-zinc-500 dark:text-zinc-400">
              <li>Abra o link da sua NFC-e no navegador.</li>
              <li>Pressione <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Ctrl+U</kbd> (ou clique com botão direito &gt; "Exibir código fonte da página").</li>
              <li>Pressione <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Ctrl+A</kbd> e depois <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[10px]">Ctrl+C</kbd> e cole abaixo:</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Código HTML da SEFAZ
            </label>
            <textarea
              rows={8}
              placeholder="Cole aqui o HTML da página (<html...)..."
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono focus:outline-hidden focus:border-orange-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              URL da Nota (Opcional)
            </label>
            <input
              type="text"
              placeholder="https://www.nfce.fazenda.sp.gov.br/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono focus:outline-hidden focus:border-orange-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!htmlInput.trim()}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-orange-500/20 text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Interpretar e Exibir Recibo
          </button>
        </form>
      </div>
    </div>
  );
};
