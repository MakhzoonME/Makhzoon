/* Top header — adapts to org vs superadmin portal */
window.App = window.App || {};

App.Header = {
  render() {
    const el = document.getElementById('topbar');
    const sa = document.body.dataset.portal === 'superadmin';
    const { org, currentSpace, notifications } = App.seed;
    const u = sa ? App.seed.saUser : App.seed.user;

    const left = sa
      ? `<div class="flex items-center gap-2 pr-3 mr-1 border-r border-slate-200">
           <span class="text-sm font-semibold text-slate-800">Makhzoon Portal</span>
           <span class="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary ring-1 ring-primary/20">Superadmin</span>
         </div>`
      : `<div class="flex items-center gap-2 pr-3 mr-1 border-r border-slate-200">
           <span class="text-sm font-semibold text-slate-800">${org.name}</span>
         </div>
         <button class="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm text-slate-700">
           <i data-lucide="git-branch" class="!w-4 !h-4 text-slate-400"></i>
           <span class="font-medium">${currentSpace.name}</span>
           <i data-lucide="chevron-down" class="!w-4 !h-4 text-slate-400"></i>
         </button>`;

    el.innerHTML = `
      <div class="h-16 px-4 flex items-center gap-3">
        ${left}
        <div class="flex-1 max-w-md">
          <div class="relative">
            <i data-lucide="search" class="!w-4 !h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input type="text" placeholder="Search…"
              class="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-100 border border-transparent focus:bg-white focus:border-slate-300 focus:outline-none text-sm placeholder:text-slate-400" />
          </div>
        </div>
        <div class="flex-1"></div>
        <button class="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500" title="Notifications">
          <i data-lucide="bell" class="!w-[18px] !h-[18px]"></i>
          ${
            notifications.unread > 0
              ? `<span class="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-haraka text-white text-[10px] font-semibold grid place-items-center">${notifications.unread}</span>`
              : ''
          }
        </button>
        <div class="relative ml-1">
          <button id="user-menu-btn" class="flex items-center gap-2 h-10 pl-1 pr-2 rounded-lg hover:bg-slate-100">
            <span class="w-8 h-8 rounded-full bg-primary text-white grid place-items-center text-[11px] font-semibold shrink-0">${u.initials}</span>
            <span class="hidden sm:block text-left leading-tight">
              <span class="block text-sm font-medium text-slate-800">${u.name}</span>
              <span class="block text-[11px] text-slate-400">${App.Sidebar.roleLabel(u.role)}</span>
            </span>
            <i data-lucide="chevron-down" class="!w-4 !h-4 text-slate-400"></i>
          </button>
          <div id="user-menu-dropdown" class="hidden absolute right-0 top-full mt-2 w-56 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50">
            <div class="px-3 py-2 border-b border-slate-100">
              <div class="text-sm font-medium text-slate-800 truncate">${u.name}</div>
              <div class="text-[11px] text-slate-400 truncate">${u.email}</div>
              <div class="text-[11px] text-slate-400 truncate">${App.Sidebar.roleLabel(u.role)}</div>
            </div>
            <button id="sign-out-btn" class="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 text-left">
              <i data-lucide="log-out" class="!w-4 !h-4"></i> Sign out
            </button>
          </div>
        </div>
      </div>`;

    App.ui.icons();
    this.wireUserMenu();
  },

  wireUserMenu() {
    const btn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-menu-dropdown');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    document.getElementById('sign-out-btn').addEventListener('click', () => {
      const sa = document.body.dataset.portal === 'superadmin';
      if (confirm('Sign out of Makhzoon?')) location.href = sa ? 'superadmin-dashboard.html' : 'index.html';
    });
  },
};
