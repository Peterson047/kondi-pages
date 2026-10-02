import React from 'react';
import {
  X,
  History,
  FileSpreadsheet,
  Trash2,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { NfceData } from '../../lib/types';
import { formatBrl, exportMultipleToCsv, downloadFile } from '../../lib/exporters';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: NfceData[];
  onSelectReceipt: (receipt: NfceData) => void;
  onDeleteReceipt: (key: string) => void;
  onClearAll: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  receipts,
  onSelectReceipt,
  onDeleteReceipt,
  onClearAll,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const totalSpent = receipts.reduce((acc, r) => acc + (r.amount_paid || r.total), 0);
  const totalItems = receipts.reduce((acc, r) => acc + r.items.length, 0);

  const handleExportAllCsv = () => {
    if (receipts.length === 0) return;
    const csv = exportMultipleToCsv(receipts);
    downloadFile(csv, `kondi-historico-consolidado-${Date.now()}.csv`, 'text/csv');
    onShowToast('Planilha com todas as notas baixada com sucesso!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#141416] text-zinc-900 dark:text-zinc-100 h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Histórico no Dispositivo</h3>
              <p className="text-xs text-zinc-400">
                {receipts.length} {receipts.length === 1 ? 'nota salva' : 'notas salvas'} (sem nuvem)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Stats */}
        {receipts.length > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Total Acumulado
              </span>
              <span className="text-xl font-black font-mono text-orange-600 dark:text-orange-500">
                {formatBrl(totalSpent)}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                {totalItems} itens catalogados
              </span>
            </div>

            <button
              onClick={handleExportAllCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors shadow-xs"
              title="Baixar planilha CSV com todas as notas fiscais somadas"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Exportar Todas (CSV)
            </button>
          </div>
        )}

        {/* Receipt List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {receipts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <History className="w-12 h-12 stroke-[1.5] text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Nenhuma nota salva ainda
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Escaneie ou importe uma NFC-e e clique em "Salvar Nota" para guardá-la no navegador.
              </p>
            </div>
          ) : (
            receipts.map((rcp) => (
              <div
                key={rcp.key}
                onClick={() => {
                  onSelectReceipt(rcp);
                  onClose();
                }}
                className="group relative p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 hover:bg-orange-50/40 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800/80 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate uppercase">
                      {rcp.store}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        {rcp.date}
                      </span>
                      <span>{rcp.items.length} itens</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black font-mono text-zinc-900 dark:text-white">
                      {formatBrl(rcp.amount_paid || rcp.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                    {rcp.key.slice(0, 16)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReceipt(rcp.key);
                        onShowToast('Nota removida do histórico.', 'info');
                      }}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
                      title="Excluir do histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-0.5">
                      Ver Recibo <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {receipts.length > 0 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja apagar todas as notas do histórico local?')) {
                  onClearAll();
                  onShowToast('Histórico limpo.', 'info');
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Tudo
            </button>
            <span className="text-[11px] text-zinc-400">
              Dados salvos no seu navegador
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
