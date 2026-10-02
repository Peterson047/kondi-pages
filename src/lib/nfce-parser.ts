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

// Clean and parse currency string (e.g. "R$ 12,34" -> 12.34)
export function parseBrlCurrency(valueStr: string): number {
  if (!valueStr) return 0;
  const cleaned = valueStr
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Extract 44-digit key from text or URL
export function extractAccessKey(raw: string): string {
  if (!raw) return '';
  // Check for 44 consecutive digits
  const match = raw.match(/\b\d{44}\b/);
  if (match) return match[0];

  // Check in URL query params (p=352405... or chNFe=...)
  try {
    const url = new URL(raw);
    const pParam = url.searchParams.get('p') || url.searchParams.get('chNFe') || '';
    const pMatch = pParam.match(/\d{44}/);
    if (pMatch) return pMatch[0];
  } catch {
    // not a valid url, try raw match with spaces removed
    const noSpace = raw.replace(/\s+/g, '');
    const m = noSpace.match(/\d{44}/);
    if (m) return m[0];
  }

  return '';
}

// 100% Client-side HTML Parser for SEFAZ-SP NFC-e
export function parseNfceHtml(html: string, originalUrl?: string): NfceData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. STORE NAME
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
    'title',
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
  const addressEl = doc.querySelector('.info, .text, .endereco');
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
    // Fallback ID if key was not parsed
    key = 'NFCE-' + Date.now();
  }

  // 5. DATE
  let date = '';
  const dateMatch = bodyText.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)/);
  if (dateMatch) {
    date = `${dateMatch[1]} ${dateMatch[2]}`;
  } else {
    // Current date formatted
    const now = new Date();
    date = now.toLocaleString('pt-BR');
  }

  // 6. ITEMS
  const items: NfceItem[] = [];
  const rows = doc.querySelectorAll('#tabResult tr, .table tr, .conteudoLinha, .item, table.table-hover tbody tr');

  let itemId = 1;
  rows.forEach((row) => {
    // Check if row has product data
    const nameEl = row.querySelector('.txtTit, .txtTit2, .nome, td.txtTit, td:first-child');
    const name = nameEl?.textContent?.trim();

    if (name && name.length > 1 && !name.toLowerCase().includes('código') && !name.toLowerCase().includes('total')) {
      const rowText = row.textContent || '';

      // Quantity
      let amount = 1;
      const amountMatch = rowText.match(/Qtde?\.?:\s*([\d,.]+)/i) || rowText.match(/(\d+(?:[.,]\d+)?)\s*(?:UN|KG|PC|CX|L|M)/i);
      if (amountMatch) {
        amount = parseBrlCurrency(amountMatch[1]);
      }

      // Unit
      let unity = 'UN';
      const unityMatch = rowText.match(/UN:\s*([A-Za-z]+)/i) || rowText.match(/\b(UN|KG|PC|CX|L|M|G|ML)\b/i);
      if (unityMatch) {
        unity = unityMatch[1].toUpperCase();
      }

      // Unit Price
      let unity_price = 0;
      const unityPriceMatch = rowText.match(/Vl?r?\.?\s*Unit\.?:\s*([\d,.]+)/i);
      if (unityPriceMatch) {
        unity_price = parseBrlCurrency(unityPriceMatch[1]);
      }

      // Total Price for this item
      let price = 0;
      const priceEl = row.querySelector('.valor, .vlr, td.valor, td:last-child');
      if (priceEl) {
        price = parseBrlCurrency(priceEl.textContent || '0');
      }

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
  ]);

  if (totalText) {
    total = parseBrlCurrency(totalText);
  }

  // If total not found by selector, sum items
  if (total === 0 && items.length > 0) {
    total = items.reduce((acc, it) => acc + it.price, 0);
  }

  // Discount
  let discount = 0;
  const discountMatch = bodyText.match(/Descontos?:\s*R?\$?\s*([\d,.]+)/i);
  if (discountMatch) {
    discount = parseBrlCurrency(discountMatch[1]);
  }

  const amount_paid = total > 0 ? total : items.reduce((acc, it) => acc + it.price, 0);

  return {
    id: key,
    key,
    store: store.replace(/^(\d+\s*-\s*)+/, '').trim(),
    cnpj,
    address,
    date,
    total: parseFloat(total.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    amount_paid: parseFloat(amount_paid.toFixed(2)),
    items,
    url: originalUrl,
    scannedAt: new Date().toISOString(),
  };
}
