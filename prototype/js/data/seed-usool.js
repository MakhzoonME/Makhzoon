/* Usool (Assets) seed data */
window.App = window.App || {}; App.seed = App.seed || {};

App.seed.assets = [
  { id: 'AS-1042', name: 'MacBook Pro 16"', category: 'Laptop', status: 'Checked Out', serial: 'C02XK1FYJG5H', assignedTo: 'Sara Khalil', location: 'HQ — Floor 3', cost: 2899 },
  { id: 'AS-1043', name: 'Dell UltraSharp 27"', category: 'Monitor', status: 'Active', serial: 'CN-0M4K2P', assignedTo: 'Omar Nasser', location: 'HQ — Floor 3', cost: 549 },
  { id: 'AS-1044', name: 'iPhone 15 Pro', category: 'Phone', status: 'Active', serial: 'F2LXK9PQ1A', assignedTo: 'Lina Haddad', location: 'HQ — Floor 2', cost: 1199 },
  { id: 'AS-1045', name: 'Herman Miller Aeron', category: 'Furniture', status: 'Active', serial: 'HM-AER-8841', assignedTo: '—', location: 'HQ — Floor 1', cost: 1395 },
  { id: 'AS-1046', name: 'Toyota Hilux', category: 'Vehicle', status: 'In Repair', serial: 'VIN-JTEBU5JR', assignedTo: 'Fleet', location: 'Warehouse', cost: 32000 },
  { id: 'AS-1047', name: 'Canon EOS R6', category: 'Equipment', status: 'Active', serial: 'CAN-R6-2207', assignedTo: 'Marketing', location: 'HQ — Studio', cost: 2499 },
  { id: 'AS-1048', name: 'Lenovo ThinkPad X1', category: 'Laptop', status: 'Active', serial: 'PF-2K9ALM', assignedTo: 'Yousef Ali', location: 'Downtown Store', cost: 1799 },
  { id: 'AS-1049', name: 'Epson Projector EB-2250', category: 'Equipment', status: 'Active', serial: 'EP-2250-114', assignedTo: 'Conf Room A', location: 'HQ — Floor 2', cost: 899 },
  { id: 'AS-1050', name: 'Samsung Galaxy Tab S9', category: 'Phone', status: 'Retired', serial: 'SM-X710-99', assignedTo: '—', location: 'Storage', cost: 749 },
  { id: 'AS-1051', name: 'Standing Desk Pro', category: 'Furniture', status: 'Active', serial: 'SDP-44120', assignedTo: 'Sara Khalil', location: 'HQ — Floor 3', cost: 620 },
  { id: 'AS-1052', name: 'HP LaserJet Pro', category: 'Equipment', status: 'In Repair', serial: 'HP-LJ-7781', assignedTo: 'Office', location: 'HQ — Floor 1', cost: 410 },
  { id: 'AS-1053', name: 'MacBook Air M3', category: 'Laptop', status: 'Checked Out', serial: 'C02MA3MX08', assignedTo: 'Nour Saleh', location: 'Downtown Store', cost: 1299 },
];

App.seed.assetStatusVariant = {
  Active: 'green', 'Checked Out': 'blue', 'In Repair': 'amber', Retired: 'slate',
};

App.seed.assetMaintenance = [
  { date: '2026-05-28', type: 'Repair', performedBy: 'IT Service Co', cost: 240, notes: 'Replaced keyboard membrane' },
  { date: '2026-03-12', type: 'Inspection', performedBy: 'Omar Nasser', cost: 0, notes: 'Quarterly hardware check — passed' },
  { date: '2025-11-04', type: 'Service', performedBy: 'Apple Care', cost: 0, notes: 'Battery service under warranty' },
];

App.seed.assetCustomFields = [
  { type: 'text', label: 'Warranty Provider', value: 'Apple Care+' },
  { type: 'select', label: 'Condition', value: 'Good', options: ['New', 'Good', 'Fair', 'Poor'] },
];
