import { parseNfceHtml } from './nfce-parser';
import { NfceData } from './types';

// List of public CORS proxies with failover
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<string> {
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
    if (!text || text.length < 50) {
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

// Fetch NFC-e HTML trying multiple CORS proxies
export async function fetchAndParseNfce(targetUrl: string): Promise<FetchResult> {
  // Validate that url looks like a real NFC-e or HTTP link
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    throw new Error('A URL precisa começar com http:// ou https://');
  }

  let lastError: Error | null = null;

  for (const buildProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = buildProxyUrl(targetUrl);
      const html = await fetchWithTimeout(proxyUrl, 7000);
      
      // Parse HTML
      const data = parseNfceHtml(html, targetUrl);
      
      // If we got at least some data (store name or total or items)
      if (data.items.length > 0 || data.total > 0 || data.store !== 'Estabelecimento Comercial') {
        return {
          data,
          source: 'proxy',
          rawHtml: html,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // continue to next proxy
    }
  }

  // If all proxies failed, throw with detailed suggestion
  throw new Error(
    lastError?.message ||
    'Não foi possível obter o conteúdo da SEFAZ pelos proxies públicos. Utilize a importação colando o código HTML da página.'
  );
}
