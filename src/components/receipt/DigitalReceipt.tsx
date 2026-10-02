import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Search,
  Store,
  Calendar,
  Tag,
  ArrowDownToLine
} from 'lucide-react';
import { NfceData } from '../../lib/types';
import {
  exportToTxt,
  exportToMarkdown,
  exportToCsv,
  downloadFile,
  copyToClipboard,
  formatBrl
} from '../../lib/exporters';

interface DigitalReceiptProps {
  receipt: NfceData;
  onSaveToHistory?: (receipt: NfceData) => void;
  isSaved?: boolean;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNewScan: () => void;
}

export const DigitalReceipt: React.FC<DigitalReceiptProps> = ({
  receipt,
  onSaveToHistory,
  isSaved = false,
  onShowToast,
  onNewScan,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  const filteredItems = receipt.items.filter((it) =>
    it.item.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (it.category && it.category.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const handleDownload = (format: 'txt' | 'md' | 'csv') => {
    const filename = `kondi-${receipt.store.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${format}`;

    if (format === 'txt') {
      const content = exportToTxt(receipt);
      downloadFile(content, filename, 'text/plain');
      onShowToast(`Recibo baixado como .txt!`, 'success');
    } else if (format === 'md') {
      const content = exportToMarkdown(receipt);
      downloadFile(content, filename, 'text/markdown');
      onShowToast(`Recibo baixado como .md!`, 'success');
    } else if (format === 'csv') {
      const content = exportToCsv(receipt);
      downloadFile(content, filename, 'text/csv');
      onShowToast(`Planilha CSV baixada (compatível com Excel)!`, 'success');
    }
  };

  const handleCopy = async (format: 'md' | 'txt' | 'key') => {
    let content = '';
    let label = '';

    if (format === 'md') {
      content = exportToMarkdown(receipt);
      label = 'Markdown copiado!';
    } else if (format === 'txt') {
      content = exportToTxt(receipt);
      label = 'Texto do cupom copiado!';
    } else if (format === 'key') {
      content = receipt.key;
      label = 'Chave de 44 dígitos copiada!';
    }

    const ok = await copyToClipboard(content);
    if (ok) {
      setCopiedFormat(format);
      onShowToast(label, 'success');
      setTimeout(() => setCopiedFormat(null), 2500);
    } else {
      onShowToast('Falha ao copiar para a área de transferência', 'error');
    }
  };

  // Format 44-digit key with groups of 4 for human readability
  const formattedKey = receipt.key
    ? receipt.key.replace(/(\d{4})/g, '$1 ').trim()
    : 'Chave não informada';

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Top Action Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onNewScan}
            className="flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-xl transition-all border border-orange-200 dark:border-orange-800/60"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Escanear Outra Nota
          </button>
          {onSaveToHistory && (
            <button
              onClick={() => onSaveToHistory(receipt)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-all border ${
                isSaved
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSaved ? 'Salvo no Histórico' : 'Salvar Nota'}
            </button>
          )}
        </div>

        {/* Quick Export Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <button
            onClick={() => handleDownload('txt')}
            title="Baixar em formato Cupom de Texto (.txt)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-orange-500" />
            .TXT
          </button>
          <button
            onClick={() => handleDownload('md')}
            title="Baixar em formato Markdown (.md)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            .MD
          </button>
          <button
            onClick={() => handleDownload('csv')}
            title="Baixar como Planilha Excel (.csv)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Planilha (CSV)
          </button>
          <button
            onClick={() => handleCopy('md')}
            title="Copiar Markdown para área de transferência"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors"
          >
            {copiedFormat === 'md' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 🧾 THE RECEIPT CONTAINER ("System Design em Nota") */}
      <div className="w-full relative bg-white dark:bg-[#141416] text-zinc-800 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transition-all duration-300">
        {/* Top Paper Header & Brand Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Receipt Top Header */}
          <div className="text-center space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                Kondi • 控计
              </span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
              {receipt.store}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {receipt.cnpj && (
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-orange-500" />
                  CNPJ: {receipt.cnpj}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                {receipt.date}
              </span>
            </div>

            {receipt.address && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-md mx-auto truncate">
                {receipt.address}
              </p>
            )}
          </div>

          {/* Receipt Items Search & Counter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <Tag className="w-3.5 h-3.5 text-orange-500" />
              Itens da Nota ({receipt.items.length})
            </div>

            {receipt.items.length > 5 && (
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar item..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            )}
          </div>

          {/* Items Table List */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 max-h-[460px] overflow-y-auto pr-1">
            {filteredItems.map((item, index) => (
              <div
                key={item.id || index}
                className="py-3 flex items-start justify-between gap-3 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 w-5">
                      {String(item.id).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {item.item}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 ml-7 text-xs text-zinc-400 font-mono">
                    <span>
                      {item.amount} {item.unity} × {formatBrl(item.unity_price)}
                    </span>
                    {item.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sans font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {item.categoryIcon} {item.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-sm text-zinc-900 dark:text-white shrink-0">
                  {formatBrl(item.price)}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">
                Nenhum item encontrado com o termo "{itemSearch}".
              </div>
            )}
          </div>

          {/* Dashed Cut Line */}
          <div className="w-full h-1 receipt-dashed-line my-4" />

          {/* Financial Breakdown (Totais) */}
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400 text-xs">
              <span>SUBTOTAL</span>
              <span>{formatBrl(receipt.total + receipt.discount)}</span>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span>DESCONTOS / BENEFÍCIOS</span>
                <span>- {formatBrl(receipt.discount)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-baseline justify-between">
              <span className="font-sans font-bold text-base md:text-lg text-zinc-900 dark:text-white uppercase tracking-tight">
                Total Pago
              </span>
              <span className="font-mono text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-500">
                {formatBrl(receipt.amount_paid || receipt.total)}
              </span>
            </div>
          </div>

          {/* Receipt Footer: Chave de 44 dígitos e Código de Barras */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
                  Chave de Acesso da NFC-e
                </span>
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300 break-all select-all">
                  {formattedKey}
                </span>
              </div>
              <button
                onClick={() => handleCopy('key')}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors shrink-0"
                title="Copiar Chave de 44 dígitos"
              >
                {copiedFormat === 'key' ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Stylized Barcode SVG Visual */}
            <div className="flex flex-col items-center justify-center pt-2 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-[2.5px] h-9 w-full max-w-sm justify-center overflow-hidden">
                {[
                  3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 2, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 4, 1, 2, 3
                ].map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w}px` }}
                    className="h-full bg-zinc-800 dark:bg-zinc-400 rounded-xs"
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 tracking-widest mt-1">
                AUTENTICAÇÃO FISCAL ELETRÔNICA
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Perforated Edge Accent */}
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900 border-t border-dashed border-zinc-300 dark:border-zinc-800" />
      </div>
    </div>
  );
};
