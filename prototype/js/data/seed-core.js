/* Core seed data — org, spaces, current user. Phase 1 only needs shell chrome. */
window.App = window.App || {};

App.seed = App.seed || {};

App.seed.org = {
  name: 'Acme Corp',
  slug: 'acme',
  initials: 'AC',
};

App.seed.spaces = [
  { slug: 'main-branch', name: 'Main Branch', isDefault: true },
  { slug: 'warehouse', name: 'Warehouse' },
  { slug: 'downtown', name: 'Downtown Store' },
];

App.seed.currentSpace = App.seed.spaces[0];

App.seed.user = {
  name: 'Sara Khalil',
  email: 'sara@acme.com',
  role: 'org_owner',
  initials: 'SK',
};

/* Superadmin portal — current user */
App.seed.saUser = {
  name: 'Omar Platform',
  email: 'omar@makhzoon.me',
  role: 'super_admin',
  initials: 'OP',
};

App.seed.notifications = { unread: 3 };
