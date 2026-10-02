export interface NfceItem {
  id: number;
  item: string;
  unity: string;
  amount: number;
  unity_price: number;
  price: number;
  category?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

export interface NfceData {
  id: string; // usually key or generated id
  key: string; // 44 digit access key
  store: string;
  cnpj: string | null;
  address: string | null;
  date: string; // ISO string or formatted
  total: number;
  discount: number;
  amount_paid: number;
  items: NfceItem[];
  url?: string;
  rawUrl?: string;
  scannedAt: string; // ISO timestamp
}

export interface CategoryRule {
  name: string;
  pattern: RegExp;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}
