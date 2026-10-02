import { NfceData } from './types';

const STORAGE_KEY = 'kondi_receipts_v1';

export function getStoredReceipts(): NfceData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Erro ao ler recibos do localStorage:', e);
    return [];
  }
}

export function saveReceiptToStorage(receipt: NfceData): NfceData[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredReceipts();
    // Filter out if duplicate key exists
    const filtered = current.filter((r) => r.key !== receipt.key);
    // Add new receipt at the beginning
    const updated = [receipt, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Erro ao salvar recibo:', e);
    return getStoredReceipts();
  }
}

export function deleteReceiptFromStorage(key: string): NfceData[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredReceipts();
    const updated = current.filter((r) => r.key !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Erro ao excluir recibo:', e);
    return getStoredReceipts();
  }
}

export function clearAllStoredReceipts(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao limpar histórico:', e);
  }
}
