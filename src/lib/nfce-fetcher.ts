import { parseNfceHtml, parseNfceFromQr } from './nfce-parser';
import { NfceData } from './types';

// List of public CORS proxies with failover
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (!text || text.length < 100) {
      throw new Error('Resposta vazia');
    }

    return text;
  } finally {
    clearTimeout(id);
  }
}

export interface FetchResult {
  data: NfceData;
  source: 'proxy' | 'manual' | 'qr-params';
  rawHtml?: string;
}

// Fetch NFC-e HTML trying multiple CORS proxies with verified QR metadata fallback
export async function fetchAndParseNfce(targetUrl: string): Promise<FetchResult> {
  const cleanUrl = targetUrl.trim();
  const qrFallback = parseNfceFromQr(cleanUrl);

  // If targetUrl is an HTTP URL, attempt proxies
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    for (const buildProxyUrl of CORS_PROXIES) {
      try {
        const proxyUrl = buildProxyUrl(cleanUrl);
        const html = await fetchWithTimeout(proxyUrl, 5000);

        const data = parseNfceHtml(html, cleanUrl);

        // Accept only if actual items were retrieved or total is confirmed > 0
        if (data.items.length > 0) {
          return {
            data,
            source: 'proxy',
            rawHtml: html,
          };
        }
      } catch {
        // try next proxy
      }
    }
  }

  // If proxies failed or blocked, but we extracted QR metadata (key, CNPJ, date):
  if (qrFallback) {
    return {
      data: qrFallback,
      source: 'qr-params',
    };
  }

  throw new Error('Não foi possível obter os dados da SEFAZ pelos proxies públicos. Utilize a importação por HTML.');
}
