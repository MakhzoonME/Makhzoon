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
      { key: 'spaces', label: 'Spaces', icon: 'layout-grid', href: '#', soon: true },
      { key: 'lists', label: 'Managed Lists', icon: 'list', href: '#', soon: true },
      { key: 'tax', label: 'Tax Rates', icon: 'percent', href: '#', soon: true },
      { key: 'receipt', label: 'Receipt', icon: 'receipt', href: '#', soon: true },
      { key: 'notifications', label: 'Notifications', icon: 'bell', href: '#', soon: true },
      { key: 'users', label: 'Users', icon: 'users', href: 'settings-users.html' },
      { key: 'subscription', label: 'Subscription', icon: 'credit-card', href: 'settings-subscription.html' },
    ];
    return items
      .map((i) => {
        const on = i.key === activeKey;
        const base = on
          ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
          : i.soon
          ? 'text-slate-400 cursor-default border-l-2 border-transparent'
          : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent';
        return `<a href="${i.href}" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${base}">
          <i data-lucide="${i.icon}" class="!w-4 !h-4"></i><span>${i.label}</span>
          ${i.soon ? '<span class="ml-auto text-[10px] text-slate-300">soon</span>' : ''}</a>`;
      })
      .join('');
  },

  icons() {
    if (window.lucide) lucide.createIcons();
  },
};
