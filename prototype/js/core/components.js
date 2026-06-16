/* Shared UI helpers — badges, formatters, fake QR. All return HTML strings. */
window.App = window.App || {};

App.ui = {
  /* Soft colored pill. variant: green|amber|red|blue|slate|orange|teal|pink */
  badge(text, variant) {
    const map = {
      green: 'bg-green-50 text-green-700 ring-green-200',
      amber: 'bg-amber-50 text-amber-700 ring-amber-200',
      red: 'bg-red-50 text-red-700 ring-red-200',
      blue: 'bg-blue-50 text-blue-700 ring-blue-200',
      slate: 'bg-slate-100 text-slate-600 ring-slate-200',
      orange: 'bg-orange-50 text-orange-700 ring-orange-200',
      teal: 'bg-teal-50 text-teal-700 ring-teal-200',
      pink: 'bg-pink-50 text-pink-700 ring-pink-200',
    };
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${map[variant] || map.slate}">${text}</span>`;
  },

  /* Status dot + label (used for stock status). variant maps to a fill color. */
  statusDot(text, variant) {
    const colors = { green: '#16A34A', amber: '#F59E0B', red: '#DC2626', blue: '#2563EB', slate: '#9CA3AF' };
    return `<span class="inline-flex items-center gap-1.5 text-sm">
      <span class="w-2 h-2 rounded-full" style="background:${colors[variant] || colors.slate}"></span>${text}</span>`;
  },

  money(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  avatar(initials, color) {
    return `<span class="w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0" style="background:${color || '#4F46E5'}">${initials}</span>`;
  },

  /* Makhzoon logo mark — rounded square with the brand "M" glyph. */
  logoMark(size, fill, glyphFill) {
    const s = size || 32;
    const fillColor = fill || '#4F46E5';
    const glyph = glyphFill || '#FFFFFF';
    const rx = Math.round(s * 0.22);
    return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="Makhzoon" class="shrink-0">
      <rect x="0" y="0" width="64" height="64" rx="${rx}" ry="${rx}" fill="${fillColor}" />
      <path d="M14 16 H22 L26 22 L32 16 L38 22 L42 16 H50 V22 H14 Z" fill="${glyph}" opacity="0.92" />
      <rect x="14" y="27" width="36" height="6" fill="${glyph}" opacity="0.78" rx="1" />
      <rect x="14" y="38" width="10" height="10" fill="${glyph}" rx="1" />
      <rect x="28" y="38" width="8" height="10" fill="${glyph}" rx="1" opacity="0.85" />
      <rect x="40" y="38" width="10" height="10" fill="${glyph}" rx="1" />
    </svg>`;
  },

  /* Deterministic pseudo-QR as SVG (placeholder only). */
  fakeQR(seed, px) {
    const n = 25;
    const size = px || 160;
    const cell = size / n;
    let s = (typeof seed === 'string' ? seed : 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 7);
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const finder = (x, y) =>
      (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    let rects = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (finder(x, y)) continue;
        if (rnd() > 0.55) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
      }
    }
    const eye = (ox, oy) =>
      `<rect x="${ox}" y="${oy}" width="${cell * 7}" height="${cell * 7}"/>` +
      `<rect x="${ox + cell}" y="${oy + cell}" width="${cell * 5}" height="${cell * 5}" fill="white"/>` +
      `<rect x="${ox + cell * 2}" y="${oy + cell * 2}" width="${cell * 3}" height="${cell * 3}" fill="black"/>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="black" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="white"/>${rects}
      ${eye(0, 0)}${eye(cell * (n - 7), 0)}${eye(0, cell * (n - 7))}</svg>`;
  },

  /* Settings left sub-nav. activeKey matches one of the built pages. */
  settingsNav(activeKey) {
    const items = [
      { key: 'org', label: 'Organization', icon: 'building', href: 'settings-org.html' },
      { key: 'spaces', label: 'Spaces', icon: 'layout-grid', href: 'settings-spaces.html' },
      { key: 'lists', label: 'Managed Lists', icon: 'list', href: 'settings-lists.html' },
      { key: 'tax', label: 'Tax Rates', icon: 'percent', href: 'settings-tax.html' },
      { key: 'receipt', label: 'Receipt', icon: 'receipt', href: 'settings-receipt.html' },
      { key: 'invoices', label: 'Invoices', icon: 'file-text', href: 'settings-invoices.html' },
      { key: 'warranties', label: 'Warranty Certificates', icon: 'shield-check', href: 'settings-warranties.html' },
      { key: 'notifications', label: 'Notifications', icon: 'bell', href: 'settings-notifications.html' },
      { key: 'users', label: 'Users', icon: 'users', href: 'settings-users.html' },
      { key: 'cash-drawer', label: 'Cash Drawer', icon: 'vault', href: 'settings-cash-drawer.html' },
      { key: 'card-terminal', label: 'Card Terminal', icon: 'credit-card', href: 'settings-card-terminal.html' },
      { key: 'order-documents', label: 'Order Documents', icon: 'file-text', href: 'settings-order-documents.html' },
      { key: 'subscription', label: 'Subscription', icon: 'badge-check', href: 'settings-subscription.html' },
    ];
    return items
      .map((i) => {
        const on = i.key === activeKey;
        const base = on
          ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
          : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent';
        return `<a href="${i.href}" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${base}">
          <i data-lucide="${i.icon}" class="!w-4 !h-4"></i><span>${i.label}</span></a>`;
      })
      .join('');
  },

  icons() {
    if (window.lucide) lucide.createIcons();
  },
};
