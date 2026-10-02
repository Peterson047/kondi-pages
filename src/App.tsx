import React, { useEffect, useState } from 'react';
import {
  Camera,
  FileCode,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DigitalReceipt } from './components/receipt/DigitalReceipt';
import { QrScannerModal } from './components/scanner/QrScannerModal';
import { ManualHtmlModal } from './components/scanner/ManualHtmlModal';
import { HistoryDrawer } from './components/history/HistoryDrawer';
import { Toast } from './components/ui/Toast';
import { NfceData } from './lib/types';
import { DEMO_RECEIPT } from './lib/mock-data';
import {
  getStoredReceipts,
  saveReceiptToStorage,
  deleteReceiptFromStorage,
  clearAllStoredReceipts
} from './lib/storage';

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kondi_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Data & History state
  const [storedReceipts, setStoredReceipts] = useState<NfceData[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<NfceData>(DEMO_RECEIPT);

  // Modal states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualHtmlOpen, setIsManualHtmlOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kondi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kondi_theme', 'light');
    }
  }, [darkMode]);

  // Load stored receipts on mount
  useEffect(() => {
    const list = getStoredReceipts();
    setStoredReceipts(list);
    // If there is at least one stored receipt, show the latest one
    if (list.length > 0) {
      setCurrentReceipt(list[0]);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleReceiptReceived = (receipt: NfceData) => {
    setCurrentReceipt(receipt);
    const updated = saveReceiptToStorage(receipt);
    setStoredReceipts(updated);
  };

  const handleSaveToHistory = (receipt: NfceData) => {
    const updated = saveReceiptToStorage(receipt);
    setStoredReceipts(updated);
    showToast('Nota salva no histórico local!', 'success');
  };

  const handleDeleteReceipt = (key: string) => {
    const updated = deleteReceiptFromStorage(key);
    setStoredReceipts(updated);
    if (currentReceipt.key === key) {
      setCurrentReceipt(updated[0] || DEMO_RECEIPT);
    }
  };

  const handleClearAllHistory = () => {
    clearAllStoredReceipts();
    setStoredReceipts([]);
    setCurrentReceipt(DEMO_RECEIPT);
  };

  const isCurrentSaved = storedReceipts.some((r) => r.key === currentReceipt.key);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7FB] dark:bg-[#0A0A0C] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Navigation */}
      <Navbar
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLoadDemo={() => {
          setCurrentReceipt(DEMO_RECEIPT);
          showToast('Exemplo do Design System carregado!', 'info');
        }}
        historyCount={storedReceipts.length}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-6 md:pt-10 space-y-8">
        {/* Header Hero Banner */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100/80 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Scanner &amp; Exportador de Cupom Fiscal Paulista
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Suas compras organizadas em um{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              recibo digital
            </span>
          </h1>

          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">
            Aponte a câmera para o QR Code da sua NFC-e e exporte os itens instantaneamente em{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">.TXT</strong>,{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">Markdown</strong> ou{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">Planilha Excel</strong>.
          </p>

          {/* Quick Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition-all text-sm"
            >
              <Camera className="w-4 h-4" />
              Escanear com a Câmera
            </button>

            <button
              onClick={() => setIsManualHtmlOpen(true)}
              className="flex items-center gap-2 px-5 py-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs transition-all text-sm"
            >
              <FileCode className="w-4 h-4 text-orange-500" />
              Colar Código HTML
            </button>
          </div>
        </section>

        {/* Highlight Alert if showing Demo Receipt */}
        {currentReceipt.key === DEMO_RECEIPT.key && (
          <div className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs text-orange-800 dark:text-orange-300 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span>
                <strong>Modo Demonstração:</strong> Você está visualizando o cupom exemplo do Kondi. Escaneie uma nota real para ver seus dados!
              </span>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="text-xs font-bold text-orange-700 dark:text-orange-400 underline shrink-0 hover:opacity-80"
            >
              Escanear agora
            </button>
          </div>
        )}

        {/* Centerpiece: THE RECEIPT (System Design em Nota) */}
        <section className="pb-10">
          <DigitalReceipt
            receipt={currentReceipt}
            onSaveToHistory={handleSaveToHistory}
            isSaved={isCurrentSaved}
            onShowToast={showToast}
            onNewScan={() => setIsScannerOpen(true)}
          />
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleReceiptReceived}
        onOpenManualHtml={() => setIsManualHtmlOpen(true)}
        onShowToast={showToast}
      />

      <ManualHtmlModal
        isOpen={isManualHtmlOpen}
        onClose={() => setIsManualHtmlOpen(false)}
        onSuccess={handleReceiptReceived}
        onShowToast={showToast}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        receipts={storedReceipts}
        onSelectReceipt={(rcp) => setCurrentReceipt(rcp)}
        onDeleteReceipt={handleDeleteReceipt}
        onClearAll={handleClearAllHistory}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
