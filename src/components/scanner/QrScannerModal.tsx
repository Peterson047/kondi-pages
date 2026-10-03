import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  Upload,
  Link as LinkIcon,
  X,
  FileCode,
  Loader2,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { fetchAndParseNfce } from '../../lib/nfce-fetcher';
import { NfceData } from '../../lib/types';
import { playScanSuccessFeedback } from '../../lib/feedback';
import confetti from 'canvas-confetti';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: NfceData) => void;
  onOpenManualHtml: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenManualHtml,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'url'>('camera');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningRef = useRef(false);

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Erro ao parar scanner:', e);
      } finally {
        isScanningRef.current = false;
      }
    }
  };

  // Process scanned text / URL
  const handleScannedResult = async (decodedText: string) => {
    await stopScanner();
    setLoading(true);
    setProxyError(null);

    try {
      // Audio beep & haptic vibration
      playScanSuccessFeedback();

      // Trigger confetti on successful detection
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F97316', '#22C55E', '#3B82F6'],
      });

      onShowToast('QR Code detectado! Obtendo dados da SEFAZ...', 'info');

      // Fetch and parse via CORS proxies
      const result = await fetchAndParseNfce(decodedText);
      onSuccess(result.data);
      onShowToast('Nota Fiscal importada com sucesso!', 'success');
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setProxyError(errorMsg);
      onShowToast('A SEFAZ bloqueou a leitura automática por proxy.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize camera when activeTab === 'camera'
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      await stopScanner();

      // Check secure context
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
        const html5QrCode = new Html5Qrcode('qr-reader-viewport', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 12, // 12 FPS gives camera hardware autofocus time & reduces CPU load
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const min = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(240, Math.floor(min * 0.88));
            return { width: edge, height: edge };
          },
        };

        const onScanSuccess = (decodedText: string) => {
          if (!isScanningRef.current) return;
          handleScannedResult(decodedText);
        };

        // Query available cameras
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
          console.warn('Não foi possível pré-listar câmeras no modal:', e);
        }

        let started = false;
        let lastError: unknown = null;

        // 1. Try user-selected camera ID if specified
        if (selectedCameraId) {
          try {
            await html5QrCode.start(selectedCameraId, config, onScanSuccess, () => {});
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
            await html5QrCode.start(chosenCam.id, config, onScanSuccess, () => {});
            started = true;
            if (isMounted && !selectedCameraId) {
              setSelectedCameraId(chosenCam.id);
            }
          } catch (e) {
            lastError = e;
            console.warn('Falha com deviceId da lista:', e);
          }
        }

        // 3. Fallback: try environment facingMode (mobile rear)
        if (!started) {
          try {
            await html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
            started = true;
          } catch (e) {
            lastError = e;
            console.warn('Falha com environment básico, tentando front camera...', e);
          }
        }

        // 4. Fallback: try user facingMode (desktop webcam / front camera)
        if (!started) {
          try {
            await html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess, () => {});
            started = true;
          } catch (e) {
            lastError = e;
            console.warn('Falha com user...', e);
          }
        }

        if (!started) {
          throw lastError || new Error('Nenhuma câmera detectada no dispositivo.');
        }

        isScanningRef.current = true;
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

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeTab, selectedCameraId]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProxyError(null);

    const html5QrCode = new Html5Qrcode('qr-file-processor');
    try {
      let decodedText = '';
      try {
        decodedText = await html5QrCode.scanFile(file, true);
      } catch {
        // Fallback: scan without cropping
        decodedText = await html5QrCode.scanFile(file, false);
      }
      await html5QrCode.clear();
      await handleScannedResult(decodedText);
    } catch (err) {
      console.error(err);
      try { html5QrCode.clear(); } catch { /* ignore */ }
      onShowToast('Não foi possível identificar um QR code válido nesta imagem. Aproxime a foto ou garanta boa iluminação.', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle URL form submit
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await handleScannedResult(urlInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141416] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Escanear Nota Fiscal</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Aponte para o QR Code da NFC-e Paulista
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            Câmera
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
              activeTab === 'file'
                ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Enviar Foto
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
              activeTab === 'url'
                ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Digitar Link
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden bg-black border-2 border-orange-500/30 flex items-center justify-center shadow-inner">
                <div id="qr-reader-viewport" className="w-full h-full" />

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="text-sm font-semibold">Extraindo dados fiscais...</span>
                    <span className="text-xs text-zinc-400">Consultando a SEFAZ</span>
                  </div>
                )}
              </div>

              {cameras.length > 1 && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Trocar câmera:</span>
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
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <span className="font-bold text-sm block">🔒 Câmera requer HTTPS no celular</span>
                          <p className="opacity-90 leading-relaxed text-xs mt-1">
                            Acessos por IP de rede local (ex: <code className="bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">http://192.168.x.x</code>) bloqueiam a câmera por segurança do navegador.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/80 dark:bg-black/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-1 text-[11px]">
                        <p>1. Inicie com HTTPS no computador: <code className="font-mono font-bold">npm run dev:https</code></p>
                        <p>2. Abra a URL gerada com <code className="font-bold">https://</code> no celular.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('file')}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Alternar para Enviar Foto
                      </button>
                    </div>
                  ) : cameraError === 'PERMISSION_DENIED' ? (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-sm">Permissão de câmera bloqueada</span>
                        <span className="opacity-90 block mt-0.5">
                          Permita o acesso à câmera nas configurações do navegador ao lado da barra de endereço.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">{cameraError}</span>
                        <span className="opacity-90 block mt-0.5">
                          Verifique se a câmera não está em uso por outro aplicativo ou use a aba <strong>Enviar Foto</strong>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FILE UPLOAD TAB */}
          {activeTab === 'file' && (
            <div className="flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-orange-500 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 transition-all text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Clique ou arraste a foto do QR Code</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Formatos suportados: PNG, JPG, JPEG ou WebP
                  </p>
                </div>
              </div>
              <div id="qr-file-processor" className="hidden" />
            </div>
          )}

          {/* URL INPUT TAB */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  URL da Nota Fiscal Paulista (SEFAZ-SP)
                </label>
                <input
                  type="url"
                  placeholder="https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-hidden focus:border-orange-500 font-mono text-xs"
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
                    Buscando dados da SEFAZ...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Processar URL
                  </>
                )}
              </button>
            </form>
          )}

          {/* PROXY BLOCKED FALLBACK WARNING */}
          {proxyError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">
                    Bloqueio temporário da SEFAZ-SP
                  </span>
                  <p className="mt-1 opacity-90 leading-relaxed">
                    A SEFAZ bloqueou a consulta automatizada por proxies públicos neste momento. Você pode colar diretamente o conteúdo da página com 1 clique!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  onClose();
                  onOpenManualHtml();
                }}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <FileCode className="w-4 h-4" />
                Colar HTML / Código da Página
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            100% no seu navegador sem login
          </span>
          <button
            onClick={() => {
              stopScanner();
              onClose();
              onOpenManualHtml();
            }}
            className="text-orange-600 dark:text-orange-400 hover:underline font-medium"
          >
            Importação manual
          </button>
        </div>
      </div>
    </div>
  );
};
