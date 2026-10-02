import { CategoryRule } from './types';

export const CATEGORY_RULES: CategoryRule[] = [
  {
    name: 'Alimentação',
    pattern: /(ARROZ|FEIJAO|MACARRAO|CARNE|FRANGO|PEIXE|LEITE|QUEIJO|PÃO|PAO|CAFE|ACUCAR|OLEO|BISCOITO|CHOCOLATE|IOGURTE|FRUTA|VERDURA|LEGUME|REFRIGERANTE|SUCO|AGUA|CERVEJA|MOLHO|MANTEIGA|BATATA|CEBOLA|TOMATE|BANANA|MACA|ALFACE|HAMBURGUER|PIZZA|SALGADO|LANCHE|REFEICAO)/i,
    icon: '🛒',
    color: '#22c55e',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    name: 'Higiene & Limpeza',
    pattern: /(SABAO|SABONETE|DETERGENTE|DESINFETANTE|AMACIANTE|SHAMPOO|CONDICIONADOR|DENTAL|ESCOVA|PAPEL HIGIENICO|ESPONJA|AGUA SANITARIA|LAVADORA|DESODORANTE|CREME|FRALDA|ABSORVENTE)/i,
    icon: '🧼',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    name: 'Saúde & Farmácia',
    pattern: /(DIPIRONA|PARACETAMOL|REMEDIO|MEDICAMENTO|POMADA|COMPRIMIDO|XAROPE|VITAMINA|SORO|GASES|BANDAGEM|ALCOOL|FARMACIA|DROGARIA)/i,
    icon: '💊',
    color: '#ef4444',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    name: 'Transporte & Posto',
    pattern: /(GASOLINA|ETANOL|COMBUSTIVEL|DIESEL|LUBRIFICANTE|OLEO MOTOR|PEDAGIO|ESTACIONAMENTO|POSTO)/i,
    icon: '⛽',
    color: '#3b82f6',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    name: 'Lazer & Restaurante',
    pattern: /(RESTAURANTE|BAR|CHOPP|CERVEJA ARTESANAL|BUFFET|SOBREMESA|CINEMA|PARQUE|ENTRADA)/i,
    icon: '🍔',
    color: '#f59e0b',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    name: 'Vestuário & Moda',
    pattern: /(CAMISA|CAMISETA|CALCA|BERMUDA|MEIA|SAPATO|TENIS|VESTIDO|SAIA|ROUPA|BONÉ|BONE)/i,
    icon: '👕',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
];

export const DEFAULT_CATEGORY: CategoryRule = {
  name: 'Outros',
  pattern: /.*/,
  icon: '📦',
  color: '#64748b',
  badgeBg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
  badgeText: 'text-zinc-600 dark:text-zinc-400',
};

export function detectItemCategory(itemName: string): CategoryRule {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(itemName)) {
      return rule;
    }
  }
  return DEFAULT_CATEGORY;
}
