import { NfceData, NfceItem } from './types';
import { detectItemCategory } from './categories';

// Helper to extract text from DOM by selectors
function extractText(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return '';
}

/**
 * Smart number parser for Brazilian NFC-e documents and URLs.
 * Correctly distinguishes between:
 * - Brazilian currency: "R$ 1.234,56", "12,34"
 * - Dot-decimal values: "12.34", "1234.56"
 * - Quantities: "0,350", "0.350", "1.500", "2"
 * NEVER multiplies by 100 accidentally!
 */
export function parseSmartNumber(val: string | number | null | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  let str = String(val).trim();
  // Strip currency prefixes, symbols, spaces, quotes
  str = str.replace(/[^\d,.-]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  // 1. Both comma and dot exist (e.g. "1.234,56" or "1,234.56")
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Brazilian style: 1.234,56 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // International style: 1,234.56 -> remove commas
      str = str.replace(/,/g, '');
    }
  }
  // 2. Only comma exists (e.g. "12,34" or "0,350")
  else if (hasComma) {
    str = str.replace(',', '.');
  }
  // 3. Only dot exists (e.g. "12.34" or "1.500")
  else if (hasDot) {
    const dotMatches = str.match(/\./g);
    if (dotMatches && dotMatches.length > 1) {
      // Multiple dots: "1.234.567" -> thousands separators
      str = str.replace(/\./g, '');
    } else {
      // Single dot: e.g. "12.34"
      // Keep dot as decimal separator
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Backward compatibility alias
export function parseBrlCurrency(valueStr: string): number {
  return parseSmartNumber(valueStr);
}

// Extract 44-digit key from text or URL
export function extractAccessKey(raw: string): string {
  if (!raw) return '';

  // 1. Check in URL query params first (p=352405... or chNFe=... or chave=...)
  try {
    const url = new URL(raw);
    const pParam = url.searchParams.get('p') || url.searchParams.get('chNFe') || url.searchParams.get('chave') || '';
    const pMatch = pParam.match(/\d{44}/);
    if (pMatch) return pMatch[0];
  } catch {
    // not a valid URL, continue
  }

  // 2. Check for 44 consecutive digits in raw text
  const match = raw.match(/\b\d{44}\b/);
  if (match) return match[0];

  // 3. Check with spaces removed
  const noSpace = raw.replace(/\s+/g, '');
  const m = noSpace.match(/\d{44}/);
  if (m) return m[0];

  return '';
}

const UF_CODES: Record<string, string> = {
  '11': 'Rondônia - RO',
  '12': 'Acre - AC',
  '13': 'Amazonas - AM',
  '14': 'Roraima - RR',
  '15': 'Pará - PA',
  '16': 'Amapá - AP',
  '17': 'Tocantins - TO',
  '21': 'Maranhão - MA',
  '22': 'Piauí - PI',
  '23': 'Ceará - CE',
  '24': 'Rio Grande do Norte - RN',
  '25': 'Paraíba - PB',
  '26': 'Pernambuco - PE',
  '27': 'Alagoas - AL',
  '28': 'Sergipe - SE',
  '29': 'Bahia - BA',
  '31': 'Minas Gerais - MG',
  '32': 'Espírito Santo - ES',
  '33': 'Rio de Janeiro - RJ',
  '35': 'São Paulo - SP',
  '41': 'Paraná - PR',
  '42': 'Santa Catarina - SC',
  '43': 'Rio Grande do Sul - RS',
  '50': 'Mato Grosso do Sul - MS',
  '51': 'Mato Grosso - MT',
  '52': 'Goiás - GO',
  '53': 'Distrito Federal - DF',
};

/**
 * Extracts verified fiscal metadata from QR Code URLs across all Brazilian states.
 * Respects SEFAZ QR-Code specifications:
 * - Version 2.0 standard: chNFe|versao|tpAmb|cDest|dhEmi|vNF|vICMS|digVal|cIdToken|cHash
 * - Version 2.0 São Paulo: chNFe|2|1|1|cHash (vNF is omitted in SP QR codes)
 * - Version 1.0 standard: chNFe|versao|tpAmb|dia|vNF|digVal|cHash
 */
export function extractQrCodeMetadata(rawText: string): {
  key: string;
  total: number;
  date: string;
  uf: string;
  cnpj: string | null;
  nNf: number | null;
  isSp: boolean;
  hasVerifiedTotal: boolean;
} {
  const key = extractAccessKey(rawText);
  if (!key || key.length !== 44) {
    return {
      key: '',
      total: 0,
      date: new Date().toLocaleDateString('pt-BR'),
      uf: '',
      cnpj: null,
      nNf: null,
      isSp: false,
      hasVerifiedTotal: false,
    };
  }

  const ufCode = key.slice(0, 2);
  const year = key.slice(2, 4);
  const month = key.slice(4, 6);
  const rawCnpj = key.slice(6, 20);
  const cnpj = rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const nNf = parseInt(key.slice(25, 34), 10);
  const isSp = ufCode === '35';
  const uf = UF_CODES[ufCode] || `UF ${ufCode}`;

  let total = 0;
  let hasVerifiedTotal = false;
  let date = `${month}/20${year}`;

  try {
    const url = new URL(rawText.trim());

    // 1. Check direct query parameters (vNF, valor, total)
    const directTotal = url.searchParams.get('vNF') || url.searchParams.get('valor') || url.searchParams.get('total');
    if (directTotal) {
      const parsed = parseSmartNumber(directTotal);
      if (parsed > 0) {
        total = parsed;
        hasVerifiedTotal = true;
      }
    }

    // 2. Check pipe-separated 'p' parameter
    const p = url.searchParams.get('p') || '';
    if (p) {
      const parts = p.split('|');

      // SP v2.0: parts = [chave, '2', '1', '1', hash40]
      // In SP QR codes, the total is NOT included in parameter p.
      const isSpV2Format = (parts.length === 5 && parts[1] === '2' && (isSp || parts[4].length >= 20));

      if (!isSpV2Format) {
        // Standard v2.0: parts[5] is vNF (e.g. 125.40)
        if (parts.length >= 6) {
          const vCandidate = parseSmartNumber(parts[5]);
          // Value must not be identical to version (2) or tpAmb (1) unless it's a real decimal
          if (vCandidate > 0 && vCandidate < 500000) {
            total = vCandidate;
            hasVerifiedTotal = true;
          }

          // Try extracting date from hex timestamp in parts[4] (dhEmi)
          const dhEmi = parts[4];
          if (dhEmi && /^[0-9a-fA-F]{8}$/.test(dhEmi)) {
            const timestamp = parseInt(dhEmi, 16) * 1000;
            if (!isNaN(timestamp) && timestamp > 946684800000) {
              date = new Date(timestamp).toLocaleString('pt-BR');
            }
          }
        }
        // Standard v1.0: parts[4] is vNF
        else if (parts.length >= 5) {
          const vCandidate = parseSmartNumber(parts[4]);
          if (vCandidate > 0 && vCandidate < 500000) {
            total = vCandidate;
            hasVerifiedTotal = true;
          }
        }
      }
    }
  } catch {
    // not a URL
  }

  return {
    key,
    total,
    date,
    uf,
    cnpj,
    nNf,
    isSp,
    hasVerifiedTotal,
  };
}

// Extract metadata directly from the 44-digit key or QR code payload
export function parseNfceFromQr(rawText: string): NfceData | null {
  const meta = extractQrCodeMetadata(rawText);
  if (!meta.key) return null;

  return {
    id: meta.key,
    key: meta.key,
    store: `Estabelecimento (CNPJ: ${meta.cnpj || 'Consultar'})`,
    cnpj: meta.cnpj,
    address: `${meta.uf}${meta.nNf ? ` • NFC-e nº ${meta.nNf}` : ''}`,
    date: meta.date,
    total: meta.total,
    discount: 0,
    amount_paid: meta.total,
    items: [],
    url: rawText,
    scannedAt: new Date().toISOString(),
    isOnlyQrMetadata: !meta.hasVerifiedTotal || meta.total === 0,
    uf: meta.uf,
  };
}

/**
 * 100% Client-side HTML Parser for SEFAZ NFC-e
 * Robustly parses items, quantities, and totals without corrupting decimals.
 */
export function parseNfceHtml(html: string, originalUrl?: string): NfceData {
  if (!html || html.length < 50) {
    throw new Error('Conteúdo HTML vazio ou insuficiente.');
  }

  // Check for proxy blocking or Cloudflare pages
  const lowerHtml = html.toLowerCase();
  if (
    lowerHtml.includes('attention required! | cloudflare') ||
    lowerHtml.includes('just a moment...') ||
    lowerHtml.includes('403 forbidden') ||
    lowerHtml.includes('access denied') ||
    lowerHtml.includes('blocked by cors')
  ) {
    throw new Error('A página retornada é um bloqueio ou proteção da SEFAZ, não o cupom fiscal.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. STORE NAME (Do NOT fall back to 'title' to prevent proxy error titles)
  const store = extractText(doc, [
    '.txtTopo',
    '#u20',
    '#conteudo .txtTopo',
    '.nome-emitente',
    '.emitente .txtTopo',
    'h4.txtTopo',
    '.box .txtTopo',
    '.txtTopo2',
    '#lblNomeFantasia',
    '.RazaoSocial',
    '#u1',
  ]) || 'Estabelecimento Comercial';

  // 2. CNPJ
  let cnpj: string | null = null;
  const bodyText = doc.body.textContent || '';
  const cnpjMatch = bodyText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  if (cnpjMatch) {
    cnpj = cnpjMatch[0];
  }

  // 3. ADDRESS
  let address: string | null = null;
  const addressEl = doc.querySelector('.info, .text, .endereco, #u21, .txtEndereco');
  if (addressEl) {
    const rawAddr = addressEl.textContent?.trim();
    if (rawAddr && rawAddr.length > 5 && !rawAddr.includes('CNPJ')) {
      address = rawAddr.replace(/\s+/g, ' ');
    }
  }

  // 4. ACCESS KEY (Chave de Acesso)
  let key = extractText(doc, [
    '.chave',
    '#spnChave',
    '.chave-acesso',
    'span.chave',
    '#lblChaveAcesso',
  ]).replace(/\s+/g, '');

  if (!key || key.length !== 44) {
    key = extractAccessKey(bodyText) || extractAccessKey(originalUrl || '');
  }

  if (!key) {
    key = 'NFCE-' + Date.now();
  }

  // 5. DATE
  let date = '';
  const dateMatch = bodyText.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)/);
  if (dateMatch) {
    date = `${dateMatch[1]} ${dateMatch[2]}`;
  } else {
    const dateShortMatch = bodyText.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateShortMatch) {
      date = dateShortMatch[1];
    } else {
      date = new Date().toLocaleString('pt-BR');
    }
  }

  // 6. ITEMS
  const items: NfceItem[] = [];
  const rows = doc.querySelectorAll('#tabResult tr, .table tr, .conteudoLinha, .item, table.table-hover tbody tr, .box-item');

  let itemId = 1;
  rows.forEach((row) => {
    const nameEl = row.querySelector('.txtTit, .txtTit2, .nome, td.txtTit, td:first-child');
    const name = nameEl?.textContent?.trim();

    if (name && name.length > 1 && !name.toLowerCase().includes('código') && !name.toLowerCase().includes('total')) {
      const rowText = row.textContent || '';

      // Quantity (e.g. "Qtde.: 2" or "Qtde.: 0,350")
      let amount = 1;
      const amountMatch = rowText.match(/Qtde?\.?:\s*([\d,.]+)/i) || rowText.match(/(\d+(?:[.,]\d+)?)\s*(?:UN|KG|PC|CX|L|M|G)/i);
      if (amountMatch) {
        amount = parseSmartNumber(amountMatch[1]);
      }

      // Unit (UN, KG, PC, CX, etc.)
      let unity = 'UN';
      const unityMatch = rowText.match(/UN:\s*([A-Za-z]+)/i) || rowText.match(/\b(UN|KG|PC|CX|L|M|G|ML)\b/i);
      if (unityMatch) {
        unity = unityMatch[1].toUpperCase();
      }

      // Unit Price (e.g. "Vl. Unit.: 12,50")
      let unity_price = 0;
      const unityPriceMatch = rowText.match(/Vl?r?\.?\s*Unit\.?:\s*([\d,.]+)/i);
      if (unityPriceMatch) {
        unity_price = parseSmartNumber(unityPriceMatch[1]);
      }

      // Total Price for this item
      let price = 0;
      const priceEl = row.querySelector('.valor, .vlr, td.valor, td:last-child');
      if (priceEl) {
        price = parseSmartNumber(priceEl.textContent);
      }

      // Cross-verification to avoid zero or mismatched unit/total
      if (price === 0 && unity_price > 0 && amount > 0) {
        price = parseFloat((unity_price * amount).toFixed(2));
      }
      if (unity_price === 0 && price > 0 && amount > 0) {
        unity_price = parseFloat((price / amount).toFixed(2));
      }

      const catRule = detectItemCategory(name);

      items.push({
        id: itemId++,
        item: name.replace(/\s+/g, ' '),
        unity: unity || 'UN',
        amount: amount || 1,
        unity_price: unity_price || price,
        price: price,
        category: catRule.name,
        categoryColor: catRule.color,
        categoryIcon: catRule.icon,
      });
    }
  });

  // 7. TOTALS
  let total = 0;
  const totalText = extractText(doc, [
    '.totalNFe',
    '#totalNota',
    '.txtMax',
    '#lblValorTotal',
    '.valorTotal',
    '#linhaTotal .totalNFe',
    '.txtTotal',
    '#spnTotal',
  ]);

  if (totalText) {
    total = parseSmartNumber(totalText);
  }

  // Fallback: if total selector failed, sum items
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, it) => acc + it.price, 0);
  }

  // Discount
  let discount = 0;
  const discountMatch = bodyText.match(/Descontos?:\s*R?\$?\s*([\d,.]+)/i);
  if (discountMatch) {
    discount = parseSmartNumber(discountMatch[1]);
  }

  const amount_paid = total > 0 ? total : items.reduce((acc, it) => acc + it.price, 0);

  const cleanStore = store
    .replace(/^(\d+\s*-\s*)+/, '')
    .replace(/CNPJ:.*$/i, '')
    .trim();

  return {
    id: key,
    key,
    store: cleanStore || 'Estabelecimento Comercial',
    cnpj,
    address,
    date,
    total: parseFloat(total.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    amount_paid: parseFloat(amount_paid.toFixed(2)),
    items,
    url: originalUrl,
    scannedAt: new Date().toISOString(),
    isOnlyQrMetadata: items.length === 0,
  };
}
