/* Raseed (Inventory) seed data */
window.App = window.App || {}; App.seed = App.seed || {};

function stockStatus(qty, min) { return qty <= 0 ? 'out' : qty <= min ? 'low' : 'ok'; }

App.seed.inventory = [
  { id: 'INV-2001', name: 'Thermal Receipt Paper 80mm', sku: 'PAP-80MM', category: 'Supplies', unit: 'roll', storage: 'Warehouse A1', qty: 420, min: 100, cost: 0.85, posEnabled: false, posPrice: 0 },
  { id: 'INV-2002', name: 'USB-C Cable 1m', sku: 'CBL-USBC-1M', category: 'Electronics', unit: 'pcs', storage: 'Warehouse A2', qty: 18, min: 25, cost: 3.2, posEnabled: true, posPrice: 9.99 },
  { id: 'INV-2003', name: 'AA Batteries (4-pack)', sku: 'BAT-AA-4', category: 'Electronics', unit: 'pack', storage: 'Warehouse A2', qty: 0, min: 40, cost: 1.5, posEnabled: true, posPrice: 4.5 },
  { id: 'INV-2004', name: 'Bottled Water 500ml', sku: 'BEV-WTR-500', category: 'Beverages', unit: 'bottle', storage: 'Cold Store', qty: 240, min: 60, cost: 0.25, posEnabled: true, posPrice: 1.0 },
  { id: 'INV-2005', name: 'Espresso Beans 1kg', sku: 'BEV-COF-1KG', category: 'Beverages', unit: 'bag', storage: 'Cold Store', qty: 12, min: 15, cost: 14.0, posEnabled: true, posPrice: 28.0 },
  { id: 'INV-2006', name: 'Cleaning Spray 750ml', sku: 'SUP-CLN-750', category: 'Supplies', unit: 'bottle', storage: 'Warehouse B1', qty: 64, min: 20, cost: 2.1, posEnabled: false, posPrice: 0 },
  { id: 'INV-2007', name: 'Wireless Mouse', sku: 'ELC-MSE-WL', category: 'Electronics', unit: 'pcs', storage: 'Warehouse A2', qty: 7, min: 10, cost: 8.5, posEnabled: true, posPrice: 19.99 },
  { id: 'INV-2008', name: 'Notebook A5', sku: 'STN-NB-A5', category: 'Stationery', unit: 'pcs', storage: 'Warehouse B2', qty: 150, min: 50, cost: 1.1, posEnabled: true, posPrice: 3.5 },
  { id: 'INV-2009', name: 'Ink Cartridge Black', sku: 'SUP-INK-BLK', category: 'Supplies', unit: 'pcs', storage: 'Warehouse B1', qty: 0, min: 12, cost: 22.0, posEnabled: false, posPrice: 0 },
  { id: 'INV-2010', name: 'Energy Drink 250ml', sku: 'BEV-ENG-250', category: 'Beverages', unit: 'can', storage: 'Cold Store', qty: 22, min: 30, cost: 0.9, posEnabled: true, posPrice: 2.75 },
].map((i) => ({ ...i, stock: stockStatus(i.qty, i.min) }));

App.seed.stockVariant = { ok: 'green', low: 'amber', out: 'red' };

App.seed.invLedger = [
  { date: '2026-06-12 14:20', type: 'OUT', qty: -6, reason: 'POS sale R-000244', by: 'Nour Saleh' },
  { date: '2026-06-11 09:05', type: 'IN', qty: 50, reason: 'PO-000004 received', by: 'Omar Nasser' },
  { date: '2026-06-09 16:42', type: 'OUT', qty: -3, reason: 'POS sale R-000231', by: 'Sara Khalil' },
  { date: '2026-06-08 11:30', type: 'ADJUSTMENT', qty: -2, reason: 'Damaged in storage', by: 'Omar Nasser' },
  { date: '2026-06-05 13:15', type: 'OUT', qty: -8, reason: 'Order ORD-000010', by: 'System' },
  { date: '2026-06-03 10:00', type: 'IN', qty: 100, reason: 'PO-000002 received', by: 'Omar Nasser' },
  { date: '2026-06-01 08:48', type: 'ADJUSTMENT', qty: 4, reason: 'Stock audit AUD-003', by: 'Lina Haddad' },
  { date: '2026-05-29 17:20', type: 'OUT', qty: -5, reason: 'POS sale R-000198', by: 'Nour Saleh' },
];

App.seed.purchases = [
  { id: 'PO-000006', vendor: 'TechSupply Co', status: 'DRAFT', items: 5, total: 1240.5, created: '2026-06-12' },
  { id: 'PO-000005', vendor: 'Gulf Beverages', status: 'RECEIVED', items: 3, total: 680.0, created: '2026-06-08' },
  { id: 'PO-000004', vendor: 'Office Depot ME', status: 'RECEIVED', items: 8, total: 2155.75, created: '2026-06-05' },
  { id: 'PO-000003', vendor: 'TechSupply Co', status: 'CANCELLED', items: 2, total: 410.0, created: '2026-05-30' },
  { id: 'PO-000002', vendor: 'Prime Distributors', status: 'RECEIVED', items: 12, total: 3890.2, created: '2026-05-22' },
  { id: 'PO-000001', vendor: 'Gulf Beverages', status: 'RECEIVED', items: 4, total: 540.0, created: '2026-05-15' },
];

App.seed.poStatusVariant = { DRAFT: 'slate', RECEIVED: 'green', CANCELLED: 'red' };

App.seed.audits = [
  { id: 'AUD-004', space: 'Main Branch', status: 'IN_PROGRESS', items: 142, variance: -3, started: '2026-06-12', completed: '—' },
  { id: 'AUD-003', space: 'Warehouse', status: 'COMPLETED', items: 310, variance: 4, started: '2026-06-01', completed: '2026-06-02' },
  { id: 'AUD-002', space: 'Downtown Store', status: 'COMPLETED', items: 88, variance: 0, started: '2026-05-18', completed: '2026-05-18' },
  { id: 'AUD-001', space: 'Main Branch', status: 'DRAFT', items: 0, variance: 0, started: '—', completed: '—' },
];

App.seed.auditStatusVariant = { DRAFT: 'slate', IN_PROGRESS: 'amber', COMPLETED: 'green' };
App.seed.txnTypeVariant = { IN: 'green', OUT: 'red', ADJUSTMENT: 'blue' };
