/** Modelo de dominio del POS (réplica de la lógica de Envi). Ver referencia-envi/ANALISIS_*.md */

export type Iso = string;

export interface Subcategory { id: string; name: string; }
export interface Category { id: string; name: string; emoji: string; color: string; subs: Subcategory[]; }

export interface ComboItem { productId: string; qty: number; }
export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string | null;
  supplierId: string | null;
  cost: number;
  price: number;        // con IVA incluido
  offer: number;        // 0 = sin oferta
  stock: number;        // se permite negativo
  lowStock: number;
  idealStock: number;
  iva: number;          // 21, 10.5, 0
  archived: boolean;
  combo: ComboItem[];   // si tiene ítems es un combo: su stock se deriva de los componentes
  createdAt: Iso;
}

export interface Customer {
  id: string; name: string; lastName: string; phone: string; email: string;
  dni: string; cuit: string; notes: string; createdAt: Iso;
}
export interface Supplier {
  id: string; name: string; cuit: string; trade: string; contact: string; phone: string;
  email: string; address: string; city: string; markup: number; notes: string; createdAt: Iso;
}

export type AccountType = 'caja' | 'banco';
export interface Account { id: string; name: string; type: AccountType; color: string; notes: string; }

/** Fila del libro de movimientos de dinero. amount: + ingreso / - egreso. */
export interface Movement {
  id: string; accountId: string; amount: number; at: Iso;
  category: string; subcategory: string; description: string;
  sourceType: string; sourceId: string; user: string;
}

export type PartyKind = 'customer' | 'supplier';
/** Fila del libro de cuenta corriente. delta: + aumenta la deuda / - la baja. */
export interface PartyEntry {
  id: string; party: PartyKind; partyId: string; at: Iso;
  kind: string;        // venta | pago | devolucion | deuda | compra | nota_credito | ajuste
  delta: number; accountId: string | null; comment: string; ref: string; user: string;
}

export type PayMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Cuenta corriente';
export interface SaleLine { productId: string; name: string; qty: number; price: number; discountUnit: number; cost: number; categoryId?: string | null; }
export interface Sale {
  id: string; number: number; at: Iso; seller: string; customerId: string | null;
  lines: SaleLine[]; subtotal: number; discountPct: number; discountAmount: number; total: number;
  method: PayMethod; paid: boolean; accountId: string | null; notes: string;
  invoiced: boolean; budgetId: string | null;
}

export type StockReason = 'Creación de producto' | 'Venta en caja' | 'Compra recibida' | 'Actualización manual' | 'Ajuste masivo' | 'Transferencia';
export interface StockMove {
  id: string; productId: string; at: Iso; prev: number; delta: number; result: number;
  reason: StockReason; ref: string; user: string;
}
export interface PriceChange { id: string; productId: string; at: Iso; field: 'price' | 'cost' | 'offer'; prev: number; next: number; user: string; }

export interface CashSession {
  id: string; accountId: string; user: string;
  openedAt: Iso; openingBalance: number; previousClose: number; notesOpen: string;
  closedAt: Iso | null; expected: number | null; real: number | null; diff: number | null; notesClose: string;
  verified: boolean; note: string;
}

export type PurchaseStatus = 'borrador' | 'pedido' | 'recibido';
export interface PurchaseLine { productId: string; name: string; qty: number; cost: number; prevCost: number; received: number; }
export interface Purchase {
  id: string; number: number; supplierId: string; status: PurchaseStatus;
  lines: PurchaseLine[]; total: number; createdAt: Iso; receivedAt: Iso | null;
  paid: boolean; name: string; user: string;
}

export interface BudgetLine { productId: string; name: string; qty: number; price: number; }
export type BudgetStatus = 'activo' | 'vendido' | 'rechazado' | 'archivado';
export interface Budget {
  id: string; number: number; customerId: string | null; createdAt: Iso; expires: Iso;
  lines: BudgetLine[]; total: number; notes: string; status: BudgetStatus; user: string;
}

export interface Cheque {
  id: string; kind: 'cobrar' | 'pagar'; amount: number; due: Iso; number: string;
  collected: boolean; customerId: string | null; description: string;
}

export type Allocation = 'iguales' | 'horas' | 'facturacion' | 'manual';
export interface FixedCost { id: string; name: string; monthly: number; notes: string; }
export interface CostCenter { id: string; name: string; allocation: Allocation; costs: FixedCost[]; }

export interface Invoice {
  id: string; number: string; at: Iso; customerId: string | null; total: number; net: number; iva: number; items: string; user: string;
}

export interface Employee { id: string; name: string; lastName: string; email: string; role: 'admin' | 'vendedor'; hired: Iso; }
export interface Shift { id: string; employeeId: string; date: string; from: string; to: string; notes: string; }

export interface Settings {
  businessName: string;
  arqueo: boolean;
  alertDiff: number;
  createProductFromCash: boolean;
  hideStockFilter: boolean;
  cumulativeDiscounts: boolean;
  sellerCommission: number;      // % informativo en reportes
  transferDiscount: number;      // % automático al pagar por transferencia (0 = desactivado)
  defaultIva: number;
  markup: number;
  hideOutOfStock: boolean;
  logo: string;                  // data URL de la imagen del negocio ('' = sin logo)
  businessColor: string; address: string; city: string; phone: string; contactEmail: string;
  receiptAction: 'nada' | 'imprimir' | 'preguntar'; receiptFormat: 'a4' | 'ticket80' | 'ticket58'; receiptQuality: 'normal' | 'baja'; exchangeTicket: boolean;
  productImages: boolean; services: boolean; weightSales: boolean; cashShipping: boolean; bankReconciliation: boolean; multiCurrency: boolean;
}

export interface Db {
  v: number;
  seq: Record<string, number>;
  settings: Settings;
  user: string;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  accounts: Account[];
  movements: Movement[];
  party: PartyEntry[];
  sales: Sale[];
  stockMoves: StockMove[];
  priceChanges: PriceChange[];
  sessions: CashSession[];
  purchases: Purchase[];
  budgets: Budget[];
  cheques: Cheque[];
  costCenters: CostCenter[];
  invoices: Invoice[];
  employees: Employee[];
  shifts: Shift[];
}
