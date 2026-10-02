import { NfceData } from './types';

// Helper to format BRL currency as "R$ 1.234,56"
export function formatBrl(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

// Format decimal number for Brazilian CSV: 12.34 -> "12,34"
function formatCsvNumber(val: number): string {
  return (val || 0).toFixed(2).replace('.', ',');
}

// 1. EXPORT TO TXT (Classic Thermal Receipt Monospaced format)
export function exportToTxt(receipt: NfceData): string {
  const width = 48;
  const line = '='.repeat(width);
  const subline = '-'.repeat(width);

  const padCenter = (str: string) => {
    const space = Math.max(0, width - str.length);
    const left = Math.floor(space / 2);
    return ' '.repeat(left) + str;
  };

  const padRow = (left: string, right: string) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const lines: string[] = [];
  lines.push(line);
  lines.push(padCenter('KONDI  控计'));
  lines.push(padCenter('GESTAO E CONTROLE DE GASTOS'));
  lines.push(line);
  lines.push(`LOJA: ${receipt.store}`);
  if (receipt.cnpj) lines.push(`CNPJ: ${receipt.cnpj}`);
  if (receipt.address) lines.push(`END : ${receipt.address.slice(0, 42)}`);
  lines.push(`DATA: ${receipt.date}`);
  lines.push(`CHAVE: ${receipt.key}`);
  lines.push(subline);
  lines.push(padRow('ITEM  DESCRICAO', 'QTD  UN    TOTAL'));
  lines.push(subline);

  receipt.items.forEach((it, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const name = it.item.slice(0, 24);
    const right = `${it.amount} ${it.unity}  ${formatBrl(it.price)}`;
    lines.push(padRow(`${num} ${name}`, right));
    if (it.category) {
      lines.push(`   [${it.category}] @ ${formatBrl(it.unity_price)}/${it.unity}`);
    }
  });

  lines.push(subline);
  const subtotal = receipt.total + receipt.discount;
  lines.push(padRow('SUBTOTAL:', formatBrl(subtotal)));
  if (receipt.discount > 0) {
    lines.push(padRow('DESCONTOS:', `- ${formatBrl(receipt.discount)}`));
  }
  lines.push(padRow('TOTAL PAGO:', formatBrl(receipt.amount_paid || receipt.total)));
  lines.push(line);
  lines.push(padCenter(`TOTAL DE ITENS: ${receipt.items.length}`));
  lines.push(padCenter('Exportado via Kondi (GitHub Pages)'));
  lines.push(line);

  return lines.join('\n');
}

// 2. EXPORT TO MARKDOWN
export function exportToMarkdown(receipt: NfceData): string {
  const lines: string[] = [];

  lines.push(`# 🧾 Nota Fiscal — ${receipt.store}`);
  lines.push('');
  lines.push(`* **Data:** \`${receipt.date}\``);
  if (receipt.cnpj) lines.push(`* **CNPJ:** \`${receipt.cnpj}\``);
  if (receipt.address) lines.push(`* **Endereço:** ${receipt.address}`);
  lines.push(`* **Chave de Acesso:** \`${receipt.key}\``);
  lines.push('');
  lines.push('### 🛒 Itens da Compra');
  lines.push('');
  lines.push('| # | Descrição | Qtd | Un | Vl. Unitário | Vl. Total | Categoria |');
  lines.push('|---|-----------|-----|----|--------------|-----------|-----------|');

  receipt.items.forEach((it, idx) => {
    lines.push(
      `| ${idx + 1} | ${it.item} | ${it.amount} | ${it.unity} | ${formatBrl(it.unity_price)} | ${formatBrl(it.price)} | ${it.categoryIcon || ''} ${it.category || 'Outros'} |`
    );
  });

  lines.push('');
  lines.push('### 💰 Resumo Financeiro');
  lines.push('');
  const subtotal = receipt.total + receipt.discount;
  lines.push(`* **Subtotal:** ${formatBrl(subtotal)}`);
  if (receipt.discount > 0) {
    lines.push(`* **Descontos:** - ${formatBrl(receipt.discount)}`);
  }
  lines.push(`* **TOTAL PAGO:** **${formatBrl(receipt.amount_paid || receipt.total)}**`);
  lines.push('');
  lines.push('---');
  lines.push('*Exportado pelo [Kondi](https://github.com/peterson047/kondi-pages) — Gestão ágil de notas fiscais.*');

  return lines.join('\n');
}

// 3. EXPORT TO CSV (Excel Brasil friendly with BOM and ;)
export function exportToCsv(receipt: NfceData): string {
  const headers = [
    'Item',
    'Descrição',
    'Quantidade',
    'Unidade',
    'Preço Unitário (R$)',
    'Preço Total (R$)',
    'Categoria',
    'Estabelecimento',
    'CNPJ',
    'Data Emissão',
    'Chave de Acesso',
  ];

  const rows = receipt.items.map((it, idx) => [
    idx + 1,
    `"${it.item.replace(/"/g, '""')}"`,
    formatCsvNumber(it.amount),
    it.unity,
    formatCsvNumber(it.unity_price),
    formatCsvNumber(it.price),
    `"${it.category || 'Outros'}"`,
    `"${receipt.store.replace(/"/g, '""')}"`,
    `"${receipt.cnpj || ''}"`,
    `"${receipt.date}"`,
    `"\t${receipt.key}"`, // tab prevents Excel scientific notation for 44-digit key
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map((r) => r.join(';')),
  ].join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark (BOM), essential for Excel to recognize accents
  return '\uFEFF' + csvContent;
}

// 4. EXPORT MULTIPLE RECEIPTS CONSOLIDATED
export function exportMultipleToCsv(receipts: NfceData[]): string {
  const headers = [
    'Nota ID',
    'Estabelecimento',
    'CNPJ',
    'Data Emissão',
    'Item',
    'Descrição',
    'Quantidade',
    'Unidade',
    'Preço Unitário (R$)',
    'Preço Total (R$)',
    'Categoria',
    'Chave de Acesso',
  ];

  const rows: string[] = [];

  receipts.forEach((rcp, rcpIdx) => {
    rcp.items.forEach((it, itIdx) => {
      rows.push([
        rcpIdx + 1,
        `"${rcp.store.replace(/"/g, '""')}"`,
        `"${rcp.cnpj || ''}"`,
        `"${rcp.date}"`,
        itIdx + 1,
        `"${it.item.replace(/"/g, '""')}"`,
        formatCsvNumber(it.amount),
        it.unity,
        formatCsvNumber(it.unity_price),
        formatCsvNumber(it.price),
        `"${it.category || 'Outros'}"`,
        `"\t${rcp.key}"`,
      ].join(';'));
    });
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

// BROWSER DOWNLOAD HELPER
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CLIPBOARD HELPER
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Falha ao copiar:', err);
    return false;
  }
}
