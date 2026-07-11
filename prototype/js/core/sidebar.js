/* Sidebar — multi-page nav (org + superadmin portals), active by body[data-page], collapse */
window.App = window.App || {};

App.BRAND = '#4F46E5'; // indigo primary-600 — non-module (platform) sections
App.lang = 'en';       // 'en' shows English labels only; 'ar' shows Arabic only (RTL)

/* Each module group leads with an Overview (module landing: stats + quick actions). */
App.NAV = [
  { item: { id: 'dashboard', label: 'Dashboard', ar: 'الرئيسية', icon: 'layout-dashboard', route: 'dashboard.html', color: App.BRAND } },
  {
    group: { label: 'Usool', ar: 'أصول', color: '#00695C' },
    items: [
      { id: 'assets', label: 'Assets', icon: 'box', route: 'usool-list.html' },
      { id: 'usool-audits', label: 'Audits', icon: 'clipboard-check', route: 'usool-audits.html' },
    ],
  },
  {
    group: { label: 'Raseed', ar: 'رصيد', color: '#E65100' },
    items: [
      { id: 'inventory', label: 'Inventory', icon: 'package', route: 'raseed-list.html' },
      { id: 'purchases', label: 'Purchase Orders', icon: 'shopping-cart', route: 'raseed-purchases.html' },
      { id: 'audits', label: 'Stock Audits', icon: 'clipboard-check', route: 'raseed-audit.html' },
    ],
  },
  {
    group: { label: 'Haraka', ar: 'حركة', color: '#C2185B' },
    items: [
      { id: 'sessions', label: 'Sessions', icon: 'history', route: 'haraka-sessions.html' },
      { id: 'orders', label: 'Orders', icon: 'shopping-bag', route: 'haraka-orders.html' },
      { id: 'transactions', label: 'Transactions', icon: 'receipt', route: 'haraka-transactions.html' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-3', route: 'haraka-reports.html' },
      { id: 'customers', label: 'Customers', icon: 'users', route: 'haraka-customers.html' },
      { id: 'delivery-agents', label: 'Delivery Agents', icon: 'truck', route: 'haraka-delivery-agents.html' },
      { id: 'warranty-certs', label: 'Warranty Certs', icon: 'shield-check', route: 'haraka-warranty-certs.html' },
    ],
  },
  {
    group: { label: 'Operations', ar: 'العمليات', color: App.BRAND },
    items: [
      { id: 'requests', label: 'Requests', icon: 'inbox', route: 'requests-list.html' },
      { id: 'warranties', label: 'Warranties', icon: 'shield-check', route: 'warranties-list.html' },
      { id: 'reports-ws', label: 'Reports', icon: 'chart-bar-big', route: 'reports.html' },
      { id: 'audit-logs', label: 'Audit Logs', icon: 'scroll-text', route: 'audit-logs.html' },
      { id: 'support', label: 'Support', icon: 'life-buoy', route: 'support-list.html' },
    ],
  },
];

/* Superadmin portal nav — all sections enabled. */
App.SA_NAV = [
  { id: 'sa-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'superadmin-dashboard.html' },
  { id: 'sa-orgs', label: 'Organizations', icon: 'building-2', route: 'superadmin-orgs.html' },
  { id: 'sa-leads', label: 'Leads & Messages', icon: 'mail', route: 'superadmin-leads.html' },
  { id: 'sa-team', label: 'Team', icon: 'users', route: 'superadmin-team.html' },
  { id: 'sa-support', label: 'Support', icon: 'life-buoy', route: 'superadmin-support.html' },
  { id: 'sa-audit', label: 'Audit Logs', icon: 'scroll-text', route: 'superadmin-audit-logs.html' },
  { id: 'sa-config', label: 'Configuration', icon: 'settings-2', route: 'superadmin-config.html' },
];

App.Sidebar = {
  collapsed: false,

  isSuperadmin() {
    return document.body.dataset.portal === 'superadmin';
  },

  roleLabel(role) {
    const s = (role || '').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  render() {
    if (this.isSuperadmin()) return this.renderSuperadmin();
    return this.renderOrg();
  },

  /* ---------------- ORG PORTAL (light) ---------------- */
  renderOrg() {
    const el = document.getElementById('sidebar');
    el.innerHTML = `
      <div class="sb-brand flex items-center gap-2.5 h-16 px-4 border-b border-slate-200 shrink-0">
        <div class="sb-logo shrink-0">${App.ui.logoMark(32)}</div>
        <div class="sb-brand-text min-w-0 flex-1">
          <div class="font-brand text-primary text-[15px] leading-tight truncate">Makhzoon</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        ${App.NAV.map((s) => this.renderSection(s)).join('')}
      </nav>
      <div class="shrink-0 border-t border-slate-200 p-2 space-y-1">
        <a href="settings-org.html" data-id="settings" class="nav-item" style="--accent:${App.BRAND}" title="Settings">
          <i data-lucide="settings"></i><span class="nav-label">Settings</span>
        </a>
      </div>
      <button id="sb-toggle" class="sb-toggle" title="Toggle sidebar">
        <i data-lucide="chevron-left" class="!w-3.5 !h-3.5"></i>
      </button>`;
    this.wire();
  },

  renderSection(section) {
    if (section.item) {
      const i = section.item;
      const label = App.lang === 'ar' ? i.ar || i.label : i.label;
      return `<div class="space-y-1">
        <a href="${i.route}" data-id="${i.id}" class="nav-item" style="--accent:${i.color}" title="${label}">
          <i data-lucide="${i.icon}"></i><span class="nav-label">${label}</span>
        </a></div>`;
    }
    const g = section.group;
    const labelText = App.lang === 'ar' ? g.ar : g.label; // EN: English only · AR: Arabic only
    return `<div class="space-y-1">
      <div class="group-label px-3 pb-0.5">${labelText}</div>
      ${section.items
        .map((i) => {
          const label = App.lang === 'ar' ? i.ar || i.label : i.label;
          return `<a href="${i.route}" data-id="${i.id}" class="nav-item" style="--accent:${g.color}" title="${label}">
            <i data-lucide="${i.icon}"></i><span class="nav-label">${label}</span></a>`;
        })
        .join('')}
    </div>`;
  },

  /* ---------------- SUPERADMIN PORTAL (light — matches org sidebar) ---------------- */
  renderSuperadmin() {
    const el = document.getElementById('sidebar');
    el.className = 'shrink-0 bg-white border-r border-slate-200 flex flex-col';
    el.style.background = '';
    el.innerHTML = `
      <div class="sb-brand flex items-center gap-2.5 h-16 px-4 border-b border-slate-200 shrink-0">
        <div class="sb-logo shrink-0">${App.ui.logoMark(32)}</div>
        <div class="sb-brand-text min-w-0 flex-1">
          <div class="font-brand text-primary text-[15px] leading-tight truncate">Makhzoon</div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        ${App.SA_NAV.map(
          (i) => `<a href="${i.route}" data-id="${i.id}" class="nav-item" style="--accent:${App.BRAND}" title="${i.label}">
            <i data-lucide="${i.icon}"></i><span class="nav-label">${i.label}</span>
          </a>`
        ).join('')}
      </nav>
      <button id="sb-toggle" class="sb-toggle" title="Toggle sidebar">
        <i data-lucide="chevron-left" class="!w-3.5 !h-3.5"></i>
      </button>`;
    this.wire();
  },

  wire() {
    document.getElementById('sb-toggle').addEventListener('click', () => this.toggle());
    App.ui.icons();
    this.setActive();
  },

  setActive() {
    const page = document.body.dataset.page;
    document.querySelectorAll('#sidebar .nav-item[data-id]').forEach((a) => {
      a.classList.toggle('active', a.dataset.id === page);
    });
  },

  toggle() {
    this.collapsed = !this.collapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', this.collapsed);
    const t = document.getElementById('sb-toggle');
    if (t) {
      t.innerHTML = `<i data-lucide="${this.collapsed ? 'chevron-right' : 'chevron-left'}" class="!w-3.5 !h-3.5"></i>`;
      App.ui.icons();
    }
  },
};
