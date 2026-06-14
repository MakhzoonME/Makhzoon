/* Haraka (POS / Orders) seed data */
window.App = window.App || {}; App.seed = App.seed || {};

App.seed.products = [
  { name: 'Cappuccino', price: 4.5, category: 'Beverages', color: '#8d6e63' },
  { name: 'Iced Latte', price: 5.0, category: 'Beverages', color: '#a1887f' },
  { name: 'Fresh Orange Juice', price: 4.0, category: 'Beverages', color: '#fb8c00' },
  { name: 'Bottled Water', price: 1.0, category: 'Beverages', color: '#4fc3f7' },
  { name: 'Chicken Shawarma', price: 6.5, category: 'Food', color: '#c2185b' },
  { name: 'Beef Burger', price: 8.0, category: 'Food', color: '#6d4c41' },
  { name: 'Caesar Salad', price: 7.0, category: 'Food', color: '#7cb342' },
  { name: 'Margherita Pizza', price: 11.0, category: 'Food', color: '#e53935' },
  { name: 'USB-C Cable', price: 9.99, category: 'Electronics', color: '#455a64' },
  { name: 'Wireless Mouse', price: 19.99, category: 'Electronics', color: '#546e7a' },
  { name: 'Power Bank 10k', price: 24.5, category: 'Electronics', color: '#37474f' },
  { name: 'Phone Stand', price: 6.0, category: 'Electronics', color: '#607d8b' },
];

App.seed.cart = [
  { name: 'Cappuccino', qty: 2, price: 4.5 },
  { name: 'Chicken Shawarma', qty: 1, price: 6.5 },
  { name: 'Bottled Water', qty: 3, price: 1.0 },
];

App.seed.orders = [
  { id: 'ORD-000012', customer: 'Khalid Mansour', channel: 'WhatsApp', items: 4, total: 86.0, payment: 'PARTIAL', fulfillment: 'Delivery', agent: 'Rami (Driver)', status: 'in_transit' },
  { id: 'ORD-000011', customer: 'Aisha Rahman', channel: 'Instagram', items: 2, total: 32.5, payment: 'PAID', fulfillment: 'Pickup', agent: '—', status: 'confirmed' },
  { id: 'ORD-000010', customer: 'Tariq Aziz', channel: 'Phone', items: 6, total: 142.0, payment: 'PAID', fulfillment: 'Delivery', agent: 'Sami (Driver)', status: 'delivered' },
  { id: 'ORD-000009', customer: 'Maya Hassan', channel: 'WhatsApp', items: 1, total: 11.0, payment: 'UNPAID', fulfillment: 'Pickup', agent: '—', status: 'new' },
  { id: 'ORD-000008', customer: 'Yousef Ali', channel: 'Facebook', items: 3, total: 58.75, payment: 'PAID', fulfillment: 'Delivery', agent: 'Rami (Driver)', status: 'assigned' },
  { id: 'ORD-000007', customer: 'Lina Haddad', channel: 'Instagram', items: 5, total: 97.0, payment: 'PARTIAL', fulfillment: 'Delivery', agent: 'Sami (Driver)', status: 'in_transit' },
  { id: 'ORD-000006', customer: 'Omar Nasser', channel: 'Phone', items: 2, total: 23.0, payment: 'PAID', fulfillment: 'Pickup', agent: '—', status: 'delivered' },
  { id: 'ORD-000005', customer: 'Nour Saleh', channel: 'WhatsApp', items: 4, total: 64.5, payment: 'PAID', fulfillment: 'Delivery', agent: 'Rami (Driver)', status: 'confirmed' },
];

App.seed.orderStatusVariant = { new: 'slate', confirmed: 'blue', assigned: 'amber', in_transit: 'orange', delivered: 'green' };
App.seed.paymentVariant = { PAID: 'green', PARTIAL: 'amber', UNPAID: 'red' };
App.seed.channelVariant = { WhatsApp: 'green', Phone: 'blue', Instagram: 'pink', Facebook: 'blue' };

App.seed.orderDetail = {
  id: 'ORD-000012', customer: 'Khalid Mansour', phone: '+962 79 555 0142', channel: 'WhatsApp',
  status: 'in_transit', created: '2026-06-12 13:40', invoice: 'INV-2026-000048',
  address: '23 Rainbow St, Jabal Amman, Amman',
  items: [
    { name: 'Beef Burger', qty: 2, price: 8.0 },
    { name: 'Margherita Pizza', qty: 1, price: 11.0 },
    { name: 'Iced Latte', qty: 3, price: 5.0 },
    { name: 'Caesar Salad', qty: 1, price: 7.0 },
  ],
  payments: [
    { date: '2026-06-12 13:42', method: 'Cash', amount: 40.0 },
  ],
};

App.seed.transactions = [
  { id: 'R-000248', customer: 'Walk-in', items: 3, total: 18.5, method: 'Cash', cashier: 'Nour Saleh', time: '14:52', status: 'Completed' },
  { id: 'R-000247', customer: 'Aisha Rahman', items: 2, total: 32.5, method: 'Card', cashier: 'Nour Saleh', time: '14:31', status: 'Completed' },
  { id: 'R-000246', customer: 'Walk-in', items: 1, total: 4.5, method: 'Cash', cashier: 'Sara Khalil', time: '13:58', status: 'Completed' },
  { id: 'R-000245', customer: 'Tariq Aziz', items: 5, total: 64.0, method: 'Card', cashier: 'Sara Khalil', time: '13:20', status: 'Refunded' },
  { id: 'R-000244', customer: 'Walk-in', items: 4, total: 27.75, method: 'Other', cashier: 'Nour Saleh', time: '12:47', status: 'Completed' },
  { id: 'R-000243', customer: 'Maya Hassan', items: 2, total: 12.0, method: 'Cash', cashier: 'Nour Saleh', time: '12:10', status: 'Void' },
  { id: 'R-000242', customer: 'Walk-in', items: 6, total: 88.25, method: 'Card', cashier: 'Sara Khalil', time: '11:35', status: 'Completed' },
  { id: 'R-000241', customer: 'Yousef Ali', items: 3, total: 41.0, method: 'Cash', cashier: 'Sara Khalil', time: '10:58', status: 'Completed' },
];

App.seed.txnStatusVariant = { Completed: 'green', Refunded: 'amber', Void: 'red' };

App.seed.customers = [
  { name: 'Khalid Mansour', phone: '+962 79 555 0142', email: 'khalid@mail.com', tax: 'JO-998211', orders: 14, last: '2026-06-12' },
  { name: 'Aisha Rahman', phone: '+962 78 401 7733', email: 'aisha.r@mail.com', tax: '—', orders: 6, last: '2026-06-11' },
  { name: 'Tariq Aziz', phone: '+962 77 220 9001', email: 'tariq@biz.co', tax: 'JO-771042', orders: 21, last: '2026-06-09' },
  { name: 'Maya Hassan', phone: '+962 79 118 3320', email: 'maya.h@mail.com', tax: '—', orders: 3, last: '2026-06-04' },
  { name: 'Yousef Ali', phone: '+962 78 909 4412', email: 'yousef.ali@mail.com', tax: 'JO-330571', orders: 9, last: '2026-06-06' },
  { name: 'Lina Haddad', phone: '+962 77 660 1188', email: 'lina@mail.com', tax: '—', orders: 5, last: '2026-06-07' },
];
