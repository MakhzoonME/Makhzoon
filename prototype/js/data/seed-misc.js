/* Cross-module seed data: dashboard, requests, warranties, audit logs, support, settings, superadmin */
window.App = window.App || {}; App.seed = App.seed || {};

/* ---- Dashboard ---- */
App.seed.dashStats = [
  { label: 'Total Assets', value: '142', icon: 'box', color: '#00695C', href: 'usool-list.html' },
  { label: 'Low Stock Items', value: '8', icon: 'package', color: '#E65100', href: 'raseed-list.html' },
  { label: 'Expiring Warranties', value: '3', icon: 'shield-check', color: '#F59E0B', href: 'warranties-list.html' },
  { label: 'Pending Requests', value: '5', icon: 'inbox', color: '#1565C0', href: 'requests-list.html' },
  { label: 'Open Sessions', value: '1', icon: 'history', color: '#C2185B', href: 'haraka-sessions.html' },
];

App.seed.activity = [
  { who: 'Sara Khalil', init: 'SK', action: 'checked out asset', target: 'MacBook Pro 16" (AS-1042)', time: '12 min ago' },
  { who: 'Nour Saleh', init: 'NS', action: 'completed sale', target: 'R-000248 · $18.50', time: '24 min ago' },
  { who: 'Omar Nasser', init: 'ON', action: 'received purchase order', target: 'PO-000005', time: '1 hr ago' },
  { who: 'Lina Haddad', init: 'LH', action: 'approved request', target: 'REQ-0033 (REFILL)', time: '2 hr ago' },
  { who: 'System', init: 'SY', action: 'flagged low stock', target: 'USB-C Cable 1m', time: '3 hr ago' },
  { who: 'Sara Khalil', init: 'SK', action: 'created order', target: 'ORD-000012', time: '4 hr ago' },
  { who: 'Yousef Ali', init: 'YA', action: 'opened POS session', target: 'Main Branch', time: '5 hr ago' },
  { who: 'Omar Nasser', init: 'ON', action: 'started stock audit', target: 'AUD-004', time: '6 hr ago' },
];

/* ---- Requests ---- */
App.seed.requests = [
  { id: 'REQ-0038', type: 'REFILL', status: 'PENDING', linked: 'AA Batteries (INV-2003)', by: 'Nour Saleh', date: '2026-06-12' },
  { id: 'REQ-0037', type: 'BUY_NEW', status: 'PENDING', linked: '—', by: 'Lina Haddad', date: '2026-06-11' },
  { id: 'REQ-0036', type: 'RETIRE', status: 'APPROVED', linked: 'Galaxy Tab S9 (AS-1050)', by: 'Omar Nasser', date: '2026-06-10' },
  { id: 'REQ-0035', type: 'EXTEND_WARRANTY', status: 'PENDING', linked: 'Toyota Hilux (AS-1046)', by: 'Fleet', date: '2026-06-09' },
  { id: 'REQ-0034', type: 'REFILL', status: 'REJECTED', linked: 'Ink Cartridge (INV-2009)', by: 'Yousef Ali', date: '2026-06-08' },
  { id: 'REQ-0033', type: 'REFILL', status: 'APPROVED', linked: 'Espresso Beans (INV-2005)', by: 'Sara Khalil', date: '2026-06-07' },
  { id: 'REQ-0032', type: 'BUY_NEW', status: 'APPROVED', linked: '—', by: 'Lina Haddad', date: '2026-06-05' },
  { id: 'REQ-0031', type: 'RETIRE', status: 'PENDING', linked: 'HP LaserJet (AS-1052)', by: 'Office', date: '2026-06-04' },
];

App.seed.requestTypeVariant = { REFILL: 'blue', RETIRE: 'slate', BUY_NEW: 'teal', EXTEND_WARRANTY: 'orange' };
App.seed.requestStatusVariant = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' };

App.seed.requestDetail = {
  id: 'REQ-0038', type: 'REFILL', status: 'PENDING', by: 'Nour Saleh', date: '2026-06-12',
  description: 'We are out of AA batteries at the Main Branch register. Customers buy these frequently — please refill at least 40 packs before the weekend rush.',
  linked: 'AA Batteries (4-pack) · INV-2003',
  custom: [
    { type: 'text', label: 'Preferred Vendor', value: 'Gulf Beverages' },
    { type: 'select', label: 'Urgency', value: 'High' },
  ],
};

/* ---- Warranties ---- */
App.seed.warranties = [
  { asset: 'MacBook Pro 16"', vendor: 'Apple Care+', start: '2025-09-01', end: '2027-09-01', status: 'Active', reminder: true },
  { asset: 'Toyota Hilux', vendor: 'Toyota Jordan', start: '2024-02-15', end: '2026-06-30', status: 'Expiring Soon', reminder: true },
  { asset: 'Dell UltraSharp 27"', vendor: 'Dell ME', start: '2024-01-10', end: '2026-01-10', status: 'Expired', reminder: false },
  { asset: 'Canon EOS R6', vendor: 'Canon Gulf', start: '2025-06-20', end: '2027-06-20', status: 'Active', reminder: true },
  { asset: 'Epson Projector', vendor: 'Epson ME', start: '2024-07-01', end: '2026-07-01', status: 'Expiring Soon', reminder: false },
  { asset: 'HP LaserJet Pro', vendor: 'HP Store', start: '2023-11-01', end: '2025-11-01', status: 'Expired', reminder: false },
  { asset: 'iPhone 15 Pro', vendor: 'Apple Care+', start: '2025-10-05', end: '2027-10-05', status: 'Active', reminder: true },
  { asset: 'Lenovo ThinkPad X1', vendor: 'Lenovo Care', start: '2025-03-12', end: '2026-06-25', status: 'Expiring Soon', reminder: true },
];

App.seed.warrantyVariant = { Active: 'green', 'Expiring Soon': 'amber', Expired: 'red' };

/* ---- Audit Logs ---- */
App.seed.auditModuleVariant = { Usool: 'teal', Raseed: 'orange', Haraka: 'pink', Requests: 'blue', Settings: 'slate', Banna: 'blue' };
App.seed.auditLogs = [
  { ts: '2026-06-12 14:52:11', user: 'Nour Saleh', action: 'pos.sale.create', module: 'Haraka', record: 'R-000248', space: 'Main Branch' },
  { ts: '2026-06-12 14:40:03', user: 'Sara Khalil', action: 'asset.checkout', module: 'Usool', record: 'AS-1042', space: 'Main Branch' },
  { ts: '2026-06-12 13:40:55', user: 'Sara Khalil', action: 'order.create', module: 'Haraka', record: 'ORD-000012', space: 'Main Branch' },
  { ts: '2026-06-12 11:20:18', user: 'Omar Nasser', action: 'inventory.adjust', module: 'Raseed', record: 'INV-2006', space: 'Warehouse' },
  { ts: '2026-06-11 16:10:42', user: 'Lina Haddad', action: 'request.approve', module: 'Requests', record: 'REQ-0036', space: 'Main Branch' },
  { ts: '2026-06-11 09:05:30', user: 'Omar Nasser', action: 'purchase.receive', module: 'Raseed', record: 'PO-000004', space: 'Warehouse' },
  { ts: '2026-06-10 15:33:09', user: 'Sara Khalil', action: 'asset.update', module: 'Usool', record: 'AS-1051', space: 'Main Branch' },
  { ts: '2026-06-10 10:12:47', user: 'Yousef Ali', action: 'asset.note.create', module: 'Usool', record: 'AS-1048', space: 'Main Branch' },
  { ts: '2026-06-09 17:48:21', user: 'System', action: 'inventory.lowstock', module: 'Raseed', record: 'INV-2002', space: 'Main Branch' },
  { ts: '2026-06-09 13:25:00', user: 'Sara Khalil', action: 'settings.update', module: 'Settings', record: 'org:acme', space: '—' },
  { ts: '2026-06-08 12:01:55', user: 'Nour Saleh', action: 'pos.refund', module: 'Haraka', record: 'R-000245', space: 'Main Branch' },
  { ts: '2026-06-08 11:30:14', user: 'Omar Nasser', action: 'inventory.adjust', module: 'Raseed', record: 'INV-2006', space: 'Warehouse' },
  { ts: '2026-06-07 14:44:38', user: 'Sara Khalil', action: 'request.approve', module: 'Requests', record: 'REQ-0033', space: 'Main Branch' },
  { ts: '2026-06-06 09:18:52', user: 'Lina Haddad', action: 'asset.create', module: 'Usool', record: 'AS-1053', space: 'Downtown Store' },
  { ts: '2026-06-05 16:55:27', user: 'Omar Nasser', action: 'audit.start', module: 'Raseed', record: 'AUD-003', space: 'Warehouse' },
];

/* ---- Support ---- */
App.seed.tickets = [
  { id: 'TKT-0061', subject: 'Receipt printer not connecting via WebUSB', status: 'OPEN', priority: 'HIGH', by: 'Nour Saleh', last: '2 hr ago', assigned: 'Makhzoon Support' },
  { id: 'TKT-0060', subject: 'Cannot export audit logs to CSV', status: 'IN_PROGRESS', priority: 'MEDIUM', by: 'Sara Khalil', last: '5 hr ago', assigned: 'Makhzoon Support' },
  { id: 'TKT-0059', subject: 'Fawtara submission failing for B2B orders', status: 'OPEN', priority: 'URGENT', by: 'Omar Nasser', last: '1 hr ago', assigned: '—' },
  { id: 'TKT-0058', subject: 'How do I add a new space?', status: 'RESOLVED', priority: 'LOW', by: 'Lina Haddad', last: '1 day ago', assigned: 'Makhzoon Support' },
  { id: 'TKT-0057', subject: 'Request to increase asset limit', status: 'CLOSED', priority: 'MEDIUM', by: 'Sara Khalil', last: '3 days ago', assigned: 'Makhzoon Support' },
  { id: 'TKT-0056', subject: 'Card terminal shows pending forever', status: 'IN_PROGRESS', priority: 'HIGH', by: 'Yousef Ali', last: '6 hr ago', assigned: 'Makhzoon Support' },
];

App.seed.ticketStatusVariant = { OPEN: 'blue', IN_PROGRESS: 'amber', RESOLVED: 'green', CLOSED: 'slate' };
App.seed.priorityVariant = { URGENT: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'slate' };

App.seed.ticketThread = {
  id: 'TKT-0061', subject: 'Receipt printer not connecting via WebUSB', status: 'OPEN', priority: 'HIGH', by: 'Nour Saleh',
  messages: [
    { from: 'staff', who: 'Nour Saleh', time: '2026-06-12 10:02', body: 'Our 80mm thermal printer stopped connecting this morning. The browser says "No device selected" even after I pick it.' },
    { from: 'team', who: 'Makhzoon Support', time: '2026-06-12 10:20', body: 'Hi Nour — thanks for reaching out. Can you confirm which browser and OS you are on? WebUSB needs Chrome or Edge on desktop.' },
    { from: 'staff', who: 'Nour Saleh', time: '2026-06-12 10:35', body: 'Chrome on Windows 11. It worked fine yesterday.' },
    { from: 'team', who: 'Makhzoon Support', time: '2026-06-12 11:48', body: 'Please try unplugging the printer, then in Chrome go to chrome://device-log to clear stale handles, and re-pair from the Printer Settings dialog. Let us know if that helps.' },
  ],
};

/* ---- Settings: Users ---- */
App.seed.users = [
  { name: 'Sara Khalil', email: 'sara@acme.com', role: 'Owner', status: 'Active', spaces: 'All spaces', init: 'SK' },
  { name: 'Omar Nasser', email: 'omar@acme.com', role: 'Admin', status: 'Active', spaces: 'Warehouse', init: 'ON' },
  { name: 'Lina Haddad', email: 'lina@acme.com', role: 'Admin', status: 'Active', spaces: 'Main Branch', init: 'LH' },
  { name: 'Nour Saleh', email: 'nour@acme.com', role: 'Staff', status: 'Active', spaces: 'Main Branch', init: 'NS' },
  { name: 'Yousef Ali', email: 'yousef@acme.com', role: 'Staff', status: 'Invited', spaces: 'Downtown Store', init: 'YA' },
  { name: 'Maya Hassan', email: 'maya@acme.com', role: 'Staff', status: 'Deactivated', spaces: '—', init: 'MH' },
];

App.seed.roleVariant = { Owner: 'teal', Admin: 'blue', Staff: 'slate' };
App.seed.userStatusVariant = { Active: 'green', Invited: 'amber', Deactivated: 'red' };
App.seed.permModules = ['Assets', 'Inventory', 'Purchases', 'Requests', 'POS', 'Reports', 'Settings'];
App.seed.permOps = ['View', 'Create', 'Update', 'Delete'];

/* ---- Superadmin ---- */
App.seed.orgs = [
  { name: 'Acme Corp', slug: 'acme', pkg: 'Business', status: 'Active', members: 6, spaces: 3, created: '2025-08-14' },
  { name: 'Bluewave Retail', slug: 'bluewave', pkg: 'Growth', status: 'Active', members: 12, spaces: 5, created: '2025-09-02' },
  { name: 'Cedar Pharmacy', slug: 'cedar', pkg: 'Starter', status: 'Active', members: 3, spaces: 1, created: '2025-10-21' },
  { name: 'Desert Logistics', slug: 'desert-log', pkg: 'Business', status: 'Suspended', members: 8, spaces: 4, created: '2025-07-30' },
  { name: 'Emerald Cafe', slug: 'emerald', pkg: 'Starter', status: 'Active', members: 2, spaces: 1, created: '2026-01-11' },
  { name: 'Falcon Electronics', slug: 'falcon', pkg: 'Growth', status: 'Active', members: 9, spaces: 2, created: '2025-11-18' },
  { name: 'Gulf Traders', slug: 'gulf-traders', pkg: 'Business', status: 'Active', members: 15, spaces: 6, created: '2025-06-05' },
  { name: 'Horizon Clinics', slug: 'horizon', pkg: 'Growth', status: 'Suspended', members: 7, spaces: 3, created: '2025-12-09' },
];

App.seed.orgStatusVariant = { Active: 'green', Suspended: 'red' };
App.seed.pkgVariant = { Starter: 'slate', Growth: 'blue', Business: 'teal' };

App.seed.team = [
  { name: 'Omar Platform', email: 'omar@makhzoon.me', role: 'super_admin', status: 'Active', last: '2 min ago', init: 'OP' },
  { name: 'Huda Admin', email: 'huda@makhzoon.me', role: 'makhzoon_admin', status: 'Active', last: '1 hr ago', init: 'HA' },
  { name: 'Sami Support', email: 'sami@makhzoon.me', role: 'makhzoon_support', status: 'Active', last: '3 hr ago', init: 'SS' },
  { name: 'Rana Support', email: 'rana@makhzoon.me', role: 'makhzoon_support', status: 'Invited', last: '—', init: 'RS' },
];

App.seed.platformRoleVariant = { super_admin: 'teal', makhzoon_admin: 'blue', makhzoon_support: 'slate' };

/* ---- Leads & Messages (superadmin contacts) ---- */
App.seed.earlyAccessLeads = [
  { name: 'Hala Mansour', email: 'hala@nimbusretail.com', company: 'Nimbus Retail', industry: 'Retail', date: '2026-06-13' },
  { name: 'Karim Fadel', email: 'karim@medico.jo', company: 'Medico Clinics', industry: 'Healthcare', date: '2026-06-12' },
  { name: 'Dana Issa', email: 'dana@brewhaus.co', company: 'BrewHaus', industry: 'Food & Beverage', date: '2026-06-11' },
  { name: 'Sami Rashed', email: 'sami@toolbox.me', company: 'Toolbox Hardware', industry: 'Retail', date: '2026-06-09' },
  { name: 'Rana Odeh', email: 'rana@edupoint.org', company: 'EduPoint', industry: 'Education', date: '2026-06-07' },
];

App.seed.salesLeads = [
  { name: 'Faris Khoury', email: 'faris@gulfmart.com', company: 'GulfMart Group', size: '50–200', interest: 'POS + Inventory', date: '2026-06-13' },
  { name: 'Lujain Saad', email: 'lujain@aurapharma.com', company: 'Aura Pharma', size: '11–50', interest: 'Assets + Warranties', date: '2026-06-12' },
  { name: 'Omar Tannous', email: 'omar@swiftlogix.com', company: 'SwiftLogix', size: '200+', interest: 'Multi-space + Orders', date: '2026-06-10' },
  { name: 'Maha Nabil', email: 'maha@deltacafe.com', company: 'Delta Cafe Chain', size: '11–50', interest: 'POS + Reports', date: '2026-06-08' },
];

App.seed.websiteMessages = [
  { name: 'Yara Adel', email: 'yara@gmail.com', subject: 'Pricing for 3 branches', message: 'Do you offer a discount for multiple branches under one account?', date: '2026-06-13' },
  { name: 'Nabil Haddad', email: 'nabil@outlook.com', subject: 'Arabic receipt support', message: 'Does the POS print Arabic receipts on a thermal printer?', date: '2026-06-12' },
  { name: 'Sara Wael', email: 'sara.w@mail.com', subject: 'Partnership inquiry', message: 'We are a hardware reseller — interested in bundling Makhzoon.', date: '2026-06-11' },
  { name: 'Tamer Eid', email: 'tamer@biz.co', subject: 'Migration from spreadsheets', message: 'Can you import our existing asset list from Excel?', date: '2026-06-09' },
  { name: 'Lina Q.', email: 'lina@mail.com', subject: 'Demo request', message: 'Could we schedule a live demo for our operations team next week?', date: '2026-06-08' },
];

/* ---- Usool Audits ---- */
App.seed.usoolAudits = [
  { id: 'UA-0012', space: 'Main Branch', status: 'completed', by: 'Sara Khalil', started: '2026-06-10', ended: '2026-06-10', total: 54, matched: 52, discrepancies: 2 },
  { id: 'UA-0011', space: 'Warehouse', status: 'completed', by: 'Omar Nasser', started: '2026-05-28', ended: '2026-05-28', total: 88, matched: 88, discrepancies: 0 },
  { id: 'UA-0010', space: 'Downtown Store', status: 'completed', by: 'Lina Haddad', started: '2026-05-15', ended: '2026-05-16', total: 31, matched: 30, discrepancies: 1 },
  { id: 'UA-0009', space: 'Main Branch', status: 'completed', by: 'Sara Khalil', started: '2026-04-30', ended: '2026-04-30', total: 54, matched: 54, discrepancies: 0 },
];
App.seed.usoolAuditStatusVariant = { completed: 'green', in_progress: 'amber', draft: 'slate' };

App.seed.usoolAuditDetail = {
  id: 'UA-0012', space: 'Main Branch', status: 'completed', by: 'Sara Khalil',
  started: '2026-06-10 09:00', ended: '2026-06-10 11:42', total: 54, matched: 52, discrepancies: 2,
  items: [
    { asset: 'MacBook Pro 16"', assetId: 'AS-1042', expected: 1, counted: 1, match: true },
    { asset: 'Dell UltraSharp 27"', assetId: 'AS-1044', expected: 2, counted: 1, match: false },
    { asset: 'iPhone 15 Pro', assetId: 'AS-1055', expected: 1, counted: 0, match: false },
    { asset: 'Wireless Mouse', assetId: 'AS-1049', expected: 4, counted: 4, match: true },
    { asset: 'USB-C Hub', assetId: 'AS-1051', expected: 3, counted: 3, match: true },
  ],
};

/* ---- Banna ---- */
App.seed.customFieldDefs = [
  { module: 'Assets', key: 'warranty_provider', label: 'Warranty Provider', type: 'text', required: false },
  { module: 'Assets', key: 'condition', label: 'Condition', type: 'select', required: true, options: 'New, Good, Fair, Poor' },
  { module: 'Assets', key: 'insured', label: 'Insured', type: 'boolean', required: false },
  { module: 'Inventory', key: 'supplier_ref', label: 'Supplier Reference', type: 'text', required: false },
  { module: 'Inventory', key: 'shelf_life', label: 'Shelf Life (days)', type: 'number', required: false },
  { module: 'Requests', key: 'urgency', label: 'Urgency', type: 'select', required: true, options: 'Low, Medium, High' },
];

App.seed.fieldTypeVariant = { text: 'slate', number: 'blue', date: 'teal', boolean: 'amber', select: 'orange', multi_select: 'orange', user: 'pink' };
