import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  Link as LinkIcon,
  FileCode,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DigitalReceipt } from './components/receipt/DigitalReceipt';
import { QrScannerModal } from './components/scanner/QrScannerModal';
import { ManualHtmlModal } from './components/scanner/ManualHtmlModal';
import { HistoryDrawer } from './components/history/HistoryDrawer';
import { Toast } from './components/ui/Toast';
import { NfceData } from './lib/types';
import { fetchAndParseNfce } from './lib/nfce-fetcher';
import { playScanSuccessFeedback } from './lib/feedback';
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

  // Data & History state (starts null: no fake data)
  const [storedReceipts, setStoredReceipts] = useState<NfceData[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<NfceData | null>(null);

  // Direct scanner state on home page
  const [scanTab, setScanTab] = useState<'camera' | 'upload' | 'link'>('camera');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Modals
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isManualHtmlOpen, setIsManualHtmlOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const directScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDirectScanningRef = useRef(false);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('kondi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('kondi_theme', 'light');
    }
  }, [darkMode]);

  // Load stored receipts on mount
  useEffect(() => {
    const list = getStoredReceipts();
    setStoredReceipts(list);
    if (list.length > 0) {
      setCurrentReceipt(list[0]);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const toggleTorch = async () => {
    if (!directScannerRef.current || !isDirectScanningRef.current) return;
    try {
      const nextState = !torchOn;
      // apply torch constraint
      await (directScannerRef.current as unknown as { applyVideoConstraints: (c: unknown) => Promise<void> }).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Lanterna não suportada ou erro ao alternar:', e);
    }
  };

  const stopDirectScanner = async () => {
    setTorchOn(false);
    setTorchSupported(false);
    if (directScannerRef.current && isDirectScanningRef.current) {
      try {
        await directScannerRef.current.stop();
        await directScannerRef.current.clear();
      } catch (e) {
        console.warn('Erro ao parar scanner:', e);
      } finally {
        isDirectScanningRef.current = false;
      }
    }
  };

  const handleProcessScannedUrl = async (scannedText: string) => {
    await stopDirectScanner();
    setLoading(true);
    setProxyError(null);

    try {
      showToast('QR Code lido! Processando nota fiscal...', 'info');

      const result = await fetchAndParseNfce(scannedText);
      handleReceiptReceived(result.data);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setProxyError(errorMsg);
      showToast('A SEFAZ bloqueou a consulta automática por proxy.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start embedded camera if on home page and no receipt is loaded
  useEffect(() => {
    if (currentReceipt !== null || scanTab !== 'camera') {
      stopDirectScanner();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      await stopDirectScanner();

      // Check secure context (browsers block getUserMedia on non-localhost HTTP)
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1'
      );
      const isSecure = typeof window !== 'undefined' && (
        window.isSecureContext ||
        window.location.protocol === 'https:' ||
        isLocalhost
      );

      if (!isSecure) {
        setCameraError('INSECURE_CONTEXT');
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('MEDIA_DEVICES_UNSUPPORTED');
        return;
      }

      try {
        // High performance QR code scanning configuration
        const qrScanner = new Html5Qrcode('home-camera-viewport', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });
        directScannerRef.current = qrScanner;

        const config = {
          fps: 12, // 12 FPS allows continuous autofocus & gives CPU headroom for dense QR codes
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const min = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(240, Math.floor(min * 0.88));
            return { width: edge, height: edge };
          },
        };

        const onScanSuccess = (decodedText: string) => {
          if (!isDirectScanningRef.current) return;
          playScanSuccessFeedback();
          handleProcessScannedUrl(decodedText);
        };

        // Query available cameras without blocking
        let deviceList = cameras;
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            deviceList = devices;
            if (isMounted) {
              setCameras(devices);
            }
          }
        } catch (e) {
          console.warn('Não foi possível pré-listar câmeras:', e);
        }

        let started = false;
        let lastError: unknown = null;

        // 1. Try user-selected camera ID if specified
        if (selectedCameraId) {
          try {
            await qrScanner.start(
              selectedCameraId,
              config,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (e) {
            lastError = e;
            console.warn('Falha com selectedCameraId:', e);
          }
        }

        // 2. If camera device list is available, pick rear camera first (mobile) or first camera (webcam/desktop)
        if (!started && deviceList.length > 0) {
          const rearCam = deviceList.find((d) => /back|traseira|rear|environment/i.test(d.label));
          const chosenCam = rearCam || deviceList[0];
          try {
            await qrScanner.start(chosenCam.id, config, onScanSuccess, () => {});
            started = true;
            if (isMounted && !selectedCameraId) {
              setSelectedCameraId(chosenCam.id);
            }
          } catch (e) {
            lastError = e;
            console.warn('Falha ao iniciar camera por deviceId:', e);
          }
        }

        // 3. Fallback: try environment facingMode (mobile rear)
        if (!started) {
          try {
            await qrScanner.start(
              { facingMode: 'environment' },
              config,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (e) {
            lastError = e;
            console.warn('Falha com facingMode environment, tentando user/webcam...', e);
          }
        }

        // 4. Fallback: try user facingMode (desktop webcam / front camera)
        if (!started) {
          try {
            await qrScanner.start({ facingMode: 'user' }, config, onScanSuccess, () => {});
            started = true;
          } catch (e) {
            lastError = e;
            console.warn('Falha com facingMode user...', e);
          }
        }

        if (!started) {
          throw lastError || new Error('Nenhuma câmera pôde ser iniciada.');
        }

        isDirectScanningRef.current = true;

        // Check if torch/flashlight is supported
        try {
          const capabilities = (qrScanner as unknown as { getRunningTrackCapabilities?: () => { torch?: boolean } }).getRunningTrackCapabilities?.();
          if (capabilities && 'torch' in capabilities) {
            setTorchSupported(true);
          }
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setCameraError('PERMISSION_DENIED');
        } else if (msg.includes('insecure') || msg.includes('getUserMedia') || msg.includes('secure context')) {
          setCameraError('INSECURE_CONTEXT');
        } else {
          setCameraError(msg);
        }
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopDirectScanner();
    };
  }, [currentReceipt, scanTab, selectedCameraId]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProxyError(null);

    const html5QrCode = new Html5Qrcode('home-file-processor');
    try {
      let decodedText = '';
      try {
        decodedText = await html5QrCode.scanFile(file, true);
      } catch {
        // Fallback: scan without cropping
        decodedText = await html5QrCode.scanFile(file, false);
      }
      playScanSuccessFeedback();
      await html5QrCode.clear();
      await handleProcessScannedUrl(decodedText);
    } catch {
      try { html5QrCode.clear(); } catch { /* ignore */ }
      showToast('Não foi possível identificar o QR code nesta imagem. Aproxime a foto ou garanta boa iluminação.', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReceiptReceived = (receipt: NfceData) => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F97316', '#22C55E', '#3B82F6'],
    });

    setCurrentReceipt(receipt);
    const updated = saveReceiptToStorage(receipt);
    setStoredReceipts(updated);
    showToast('Nota Fiscal carregada com sucesso!', 'success');
  };

  const handleSaveToHistory = (receipt: NfceData) => {
    const updated = saveReceiptToStorage(receipt);
    setStoredReceipts(updated);
    showToast('Nota salva no histórico local!', 'success');
  };

  const handleDeleteReceipt = (key: string) => {
    const updated = deleteReceiptFromStorage(key);
    setStoredReceipts(updated);
    if (currentReceipt?.key === key) {
      setCurrentReceipt(updated[0] || null);
    }
  };

  const handleClearAllHistory = () => {
    clearAllStoredReceipts();
    setStoredReceipts([]);
    setCurrentReceipt(null);
  };

  const isCurrentSaved = currentReceipt ? storedReceipts.some((r) => r.key === currentReceipt.key) : false;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7FB] dark:bg-[#0A0A0C] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        onOpenScanner={() => {
          if (currentReceipt) {
            setIsScannerModalOpen(true);
          } else {
            setScanTab('camera');
          }
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={storedReceipts.length}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 md:pt-10 space-y-8">
        {/* VIEW 1: WHEN NO RECEIPT IS ACTIVE (DIRECT SCANNER VIEW: ABRIR > ESCANEAR) */}
        {!currentReceipt && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                Escanear Nota Fiscal Paulista
              </h1>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
                Aponte para o QR Code da NFC-e para visualizar o cupom e exportar em .txt, .md ou planilha.
              </p>
            </div>

            {/* Main Scanner Card */}
            <div className="bg-white dark:bg-[#141416] rounded-3xl shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
              {/* Method Switcher Tabs */}
              <div className="flex p-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold gap-1">
                <button
                  onClick={() => setScanTab('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    scanTab === 'camera'
                      ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Câmera
                </button>
                <button
                  onClick={() => setScanTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    scanTab === 'upload'
                      ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Enviar Foto
                </button>
                <button
                  onClick={() => setScanTab('link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    scanTab === 'link'
                      ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Digitar Link
                </button>
              </div>

              {/* Tab 1: Live Camera Viewport */}
              {scanTab === 'camera' && (
                <div className="p-6 flex flex-col items-center justify-center">
                  <div className="relative w-full aspect-square max-w-[340px] rounded-3xl overflow-hidden bg-black border-2 border-orange-500/40 flex items-center justify-center shadow-2xl">
                    <div id="home-camera-viewport" className="w-full h-full object-cover" />

                    {/* Retículo de Mira & Laser Ativo */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-[82%] h-[82%]">
                        {/* 4 cantos alaranjados */}
                        <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-orange-500 rounded-tl-xl shadow-xs" />
                        <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-orange-500 rounded-tr-xl shadow-xs" />
                        <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-orange-500 rounded-bl-xl shadow-xs" />
                        <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-orange-500 rounded-br-xl shadow-xs" />

                        {/* Linha de laser escaneando */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_8px_#F97316] animate-scan-laser" />
                      </div>
                    </div>

                    {/* Botão de Lanterna / Torch (se suportado pelo hardware) */}
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`absolute bottom-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all z-30 ${
                          torchOn
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50 scale-105'
                            : 'bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80'
                        }`}
                        title={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}

                    {loading && (
                      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white gap-2 p-4 text-center z-30 backdrop-blur-xs">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <span className="text-sm font-bold">Lendo QR Code...</span>
                        <span className="text-xs text-zinc-400">Consultando a SEFAZ</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center mt-3">
                    💡 Centralize o QR Code no quadrado. Afaste 15 a 20 cm para foco nítido.
                  </p>

                  {cameras.length > 1 && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-zinc-400">Câmera:</span>
                      <select
                        value={selectedCameraId}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium"
                      >
                        {cameras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label || `Câmera ${c.id.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {cameraError && (
                    <div className="mt-4 w-full">
                      {cameraError === 'INSECURE_CONTEXT' ? (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-3">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="space-y-1">
                              <span className="font-bold text-sm block">🔒 Câmera bloqueada pelo navegador (Contexto HTTP)</span>
                              <p className="opacity-90 leading-relaxed text-xs">
                                Você está acessando através do IP da rede local (ex: <code className="bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">http://192.168.x.x</code>).
                                Por segurança, os navegadores modernos só liberam a câmera via <strong>HTTPS</strong> ou <strong>localhost</strong>.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white/80 dark:bg-black/40 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-1.5 text-[11px]">
                            <span className="font-bold text-amber-800 dark:text-amber-300 block">
                              Como usar a câmera no celular via Wi-Fi:
                            </span>
                            <p>1. No computador, inicie o servidor com suporte a HTTPS:</p>
                            <code className="block bg-zinc-900 text-zinc-100 dark:bg-black p-2 rounded-lg font-mono text-[11px] my-1 border border-zinc-700">
                              npm run dev:https
                            </code>
                            <p>2. Abra a URL gerada com <code className="font-bold">https://</code> no celular (aceite o aviso de certificado auto-assinado).</p>
                            <p>3. Ou no computador, acesse diretamente via <code className="font-bold">http://localhost:5173</code>.</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setScanTab('upload')}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />
                            Usar Envio de Foto (Funciona sem HTTPS)
                          </button>
                        </div>
                      ) : cameraError === 'PERMISSION_DENIED' ? (
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block text-sm">Permissão da câmera bloqueada</span>
                            <span className="opacity-90 block mt-0.5">
                              O navegador bloqueou o acesso à câmera. Clique no ícone de configurações ou cadeado na barra de endereços do navegador e mude a permissão de "Câmera" para "Permitir".
                            </span>
                          </div>
                        </div>
                      ) : cameraError === 'MEDIA_DEVICES_UNSUPPORTED' ? (
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block text-sm">Câmera não suportada neste navegador</span>
                            <span className="opacity-90 block mt-0.5">
                              A API de captura de vídeo não está disponível neste navegador. Experimente usar a aba <strong>Enviar Foto</strong>.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">{cameraError}</span>
                            <span className="opacity-90 block mt-0.5">
                              Verifique se a câmera não está em uso por outro aplicativo ou selecione outra câmera acima. Alternativamente, use a aba <strong>Enviar Foto</strong> ou <strong>Digitar Link</strong>.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: File Upload */}
              {scanTab === 'upload' && (
                <div className="p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-orange-500 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
                      {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Clique ou envie a foto da Nota</h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Selecione uma imagem contendo o QR Code da NFC-e
                      </p>
                    </div>
                  </div>
                  <div id="home-file-processor" className="hidden" />
                </div>
              )}

              {/* Tab 3: Link Input */}
              {scanTab === 'link' && (
                <div className="p-6 space-y-4">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!urlInput.trim()) return;
                      await handleProcessScannedUrl(urlInput.trim());
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                        Cole a URL da NFC-e da SEFAZ
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.nfce.fazenda.sp.gov.br/...aspx?p=..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !urlInput.trim()}
                      className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-orange-500/20 text-sm flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Consultando SEFAZ...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Carregar Nota
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Fallback info when proxy fails */}
              {proxyError && (
                <div className="mx-6 mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm">Bloqueio da SEFAZ</span>
                      <p className="mt-1 opacity-90 leading-relaxed">
                        A SEFAZ bloqueou a leitura automática por proxy. Você pode colar o código HTML da página da consulta da SEFAZ com 1 clique:
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsManualHtmlOpen(true)}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FileCode className="w-4 h-4" />
                    Colar Código HTML da Página
                  </button>
                </div>
              )}

              {/* Footer inside card */}
              <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  100% no seu navegador sem login
                </span>
                <button
                  onClick={() => setIsManualHtmlOpen(true)}
                  className="text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                >
                  Colar código HTML
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: WHEN RECEIPT IS SCANNED (THE REAL DIGITAL RECEIPT WITH EXPORTS) */}
        {currentReceipt && (
          <section className="pb-10 animate-in fade-in duration-300">
            <DigitalReceipt
              receipt={currentReceipt}
              onSaveToHistory={handleSaveToHistory}
              isSaved={isCurrentSaved}
              onShowToast={showToast}
              onNewScan={() => {
                setCurrentReceipt(null);
                setScanTab('camera');
              }}
              onOpenManualHtml={() => setIsManualHtmlOpen(true)}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <QrScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
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
