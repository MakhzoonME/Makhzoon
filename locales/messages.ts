/**
 * Single source of truth for all UI copy.
 * To change any message, edit this file only.
 * Keys are dot-namespaced: 'nav.dashboard', 'common.save', etc.
 */

export type Locale = 'en' | 'ar';

const en = {
  // ── Navigation ──────────────────────────────────────────────────
  'nav.dashboard':     'Dashboard',
  'nav.assets':        'Assets',
  'nav.inventory':     'Inventory',
  'nav.warranties':    'Warranties',
  'nav.requests':      'Requests',
  'nav.reports':       'Reports',
  'nav.users':         'Users',
  'nav.subscription':  'Subscription',
  'nav.support':       'Support',
  'nav.auditLogs':     'Audit Logs',
  // Superadmin
  'nav.organizations': 'Organizations',
  'nav.configuration': 'Configuration',
  'nav.team':          'Team',
  'nav.backendLogs':   'Backend Logs',

  // ── Common actions ───────────────────────────────────────────────
  'common.save':         'Save',
  'common.saveChanges':  'Save Changes',
  'common.cancel':       'Cancel',
  'common.delete':       'Delete',
  'common.edit':         'Edit',
  'common.add':          'Add',
  'common.create':       'Create',
  'common.search':       'Search…',
  'common.loading':      'Loading…',
  'common.noResults':    'No results found.',
  'common.signOut':      'Sign out',
  'common.profile':      'Profile',
  'common.yes':          'Yes',
  'common.no':           'No',
  'common.confirm':      'Confirm',
  'common.adding':       'Adding…',
  'common.saving':       'Saving…',
  'common.deleting':     'Deleting…',
  'common.inviting':     'Inviting…',

  // ── Appearance / Language ────────────────────────────────────────
  'theme.label':   'Appearance',
  'theme.light':   'Light',
  'theme.dark':    'Dark',
  'theme.system':  'System',
  'lang.label':    'Language',
  'lang.en':       'English',
  'lang.ar':       'العربية',

  // ── Auth ─────────────────────────────────────────────────────────
  'auth.signIn':        'Sign in',
  'auth.signOut':       'Sign out',
  'auth.email':         'Email address',
  'auth.password':      'Password',
  'auth.forgotPassword':'Forgot password?',
  'auth.noAccount':     "Don't have an account?",
  'auth.haveAccount':   'Already have an account?',

  // ── Status labels ────────────────────────────────────────────────
  'status.active':      'Active',
  'status.deactivated': 'Deactivated',
  'status.pending':     'Pending',
  'status.expired':     'Expired',
  'status.revoked':     'Revoked',

  // ── Role labels ──────────────────────────────────────────────────
  'role.superAdmin':       'Super Admin',
  'role.makhzoonAdmin':    'Makhzoon Admin',
  'role.makhzoonSupport':  'Makhzoon Support',
  'role.orgOwner':         'Owner',
  'role.admin':            'Admin',
  'role.staff':            'Staff',

  // ── Users page ───────────────────────────────────────────────────
  'users.title':        'Users',
  'users.inviteUser':   'Invite User',
  'users.name':         'Name',
  'users.emailUsername':'Email / Username',
  'users.role':         'Role',
  'users.status':       'Status',
  'users.joined':       'Joined / Expires',
  'users.noResults':    'No users found.',
  'users.editUser':     'Edit User',
  'users.deactivate':   'Deactivate',
  'users.reactivate':   'Reactivate',
  'users.deleteUser':   'Delete User Permanently',
  'users.revokeInvite': 'Revoke',
  'users.revoking':     'Revoking…',

  // ── Invite modal ─────────────────────────────────────────────────
  'invite.title':         'Invite Team Member',
  'invite.emailInvite':   'Email invite',
  'invite.usernameInvite':'Username invite',
  'invite.displayName':   'Full Name',
  'invite.emailAddress':  'Email address',
  'invite.username':      'Username',
  'invite.role':          'Role',
  'invite.sendInvite':    'Send Invite',
  'invite.inviteAnother': 'Invite Another',
  'invite.done':          'Done',
  'invite.copyLink':      'Copy Link',
  'invite.copied':        'Copied!',
  'invite.downloadQR':    'Download QR',
  'invite.linkExpires':   'This link expires in 7 days.',
  'invite.sent':          'Invitation sent via email.',
  'invite.setPermissions':'Set Access Permissions',
  'invite.hidePermissions':'Hide Access Permissions',

  // ── Superadmin Team ──────────────────────────────────────────────
  'team.title':          'Makhzoon Team',
  'team.subtitle':       'Internal team members with superadmin access.',
  'team.addMember':      'Add Member',
  'team.editMember':     'Edit Member',
  'team.fullName':       'Full Name',
  'team.email':          'Email',
  'team.role':           'Role',
  'team.status':         'Status',
  'team.added':          'Added',
  'team.tempPassword':   'Temporary Password',
  'team.adding':         'Adding…',
  'team.deactivate':     'Deactivate',
  'team.reactivate':     'Reactivate',
  'team.delete':         'Delete',
  'team.noResults':      'No team members found.',
  'team.you':            'you',
  'team.passwordHint':   'Sent to the member by email. They should change it after first login.',
  'team.show':           'Show',
  'team.hide':           'Hide',

  // ── Permissions editor ───────────────────────────────────────────
  'permissions.setAccess':  'Set Access Permissions',
  'permissions.hideAccess': 'Hide Access Permissions',
  'permissions.editAccess': 'Edit Access Permissions',
  'permissions.default':    'Default: view-only access. Click above to customise.',
  'permissions.defaultAdmin':'All permissions enabled by default. Click above to customise.',

  // ── Superadmin portal ────────────────────────────────────────────
  'superadmin.brandName': 'Makhzoon',
  'superadmin.portal':    'Superadmin Portal',

  // ── Org portal ───────────────────────────────────────────────────
  'org.search': 'Search…',
} as const;

const ar: Record<keyof typeof en, string> = {
  // ── Navigation ──────────────────────────────────────────────────
  'nav.dashboard':     'لوحة التحكم',
  'nav.assets':        'الأصول',
  'nav.inventory':     'المخزون',
  'nav.warranties':    'الضمانات',
  'nav.requests':      'الطلبات',
  'nav.reports':       'التقارير',
  'nav.users':         'المستخدمون',
  'nav.subscription':  'الاشتراك',
  'nav.support':       'الدعم',
  'nav.auditLogs':     'سجل المراجعة',
  'nav.organizations': 'المنظمات',
  'nav.configuration': 'الإعدادات',
  'nav.team':          'الفريق',
  'nav.backendLogs':   'سجلات النظام',

  // ── Common actions ───────────────────────────────────────────────
  'common.save':         'حفظ',
  'common.saveChanges':  'حفظ التغييرات',
  'common.cancel':       'إلغاء',
  'common.delete':       'حذف',
  'common.edit':         'تعديل',
  'common.add':          'إضافة',
  'common.create':       'إنشاء',
  'common.search':       'بحث...',
  'common.loading':      'جاري التحميل...',
  'common.noResults':    'لا توجد نتائج.',
  'common.signOut':      'تسجيل الخروج',
  'common.profile':      'الملف الشخصي',
  'common.yes':          'نعم',
  'common.no':           'لا',
  'common.confirm':      'تأكيد',
  'common.adding':       'جاري الإضافة...',
  'common.saving':       'جاري الحفظ...',
  'common.deleting':     'جاري الحذف...',
  'common.inviting':     'جاري الدعوة...',

  // ── Appearance / Language ────────────────────────────────────────
  'theme.label':   'المظهر',
  'theme.light':   'فاتح',
  'theme.dark':    'داكن',
  'theme.system':  'تلقائي',
  'lang.label':    'اللغة',
  'lang.en':       'English',
  'lang.ar':       'العربية',

  // ── Auth ─────────────────────────────────────────────────────────
  'auth.signIn':         'تسجيل الدخول',
  'auth.signOut':        'تسجيل الخروج',
  'auth.email':          'البريد الإلكتروني',
  'auth.password':       'كلمة المرور',
  'auth.forgotPassword': 'نسيت كلمة المرور؟',
  'auth.noAccount':      'ليس لديك حساب؟',
  'auth.haveAccount':    'لديك حساب بالفعل؟',

  // ── Status labels ────────────────────────────────────────────────
  'status.active':      'نشط',
  'status.deactivated': 'معطّل',
  'status.pending':     'قيد الانتظار',
  'status.expired':     'منتهي الصلاحية',
  'status.revoked':     'ملغي',

  // ── Role labels ──────────────────────────────────────────────────
  'role.superAdmin':      'مشرف عام',
  'role.makhzoonAdmin':   'مدير مخزون',
  'role.makhzoonSupport': 'دعم مخزون',
  'role.orgOwner':        'مالك',
  'role.admin':           'مدير',
  'role.staff':           'موظف',

  // ── Users page ───────────────────────────────────────────────────
  'users.title':         'المستخدمون',
  'users.inviteUser':    'دعوة مستخدم',
  'users.name':          'الاسم',
  'users.emailUsername': 'البريد / اسم المستخدم',
  'users.role':          'الدور',
  'users.status':        'الحالة',
  'users.joined':        'تاريخ الانضمام / الانتهاء',
  'users.noResults':     'لا يوجد مستخدمون.',
  'users.editUser':      'تعديل المستخدم',
  'users.deactivate':    'تعطيل',
  'users.reactivate':    'تفعيل',
  'users.deleteUser':    'حذف المستخدم نهائياً',
  'users.revokeInvite':  'إلغاء',
  'users.revoking':      'جاري الإلغاء...',

  // ── Invite modal ─────────────────────────────────────────────────
  'invite.title':          'دعوة عضو فريق',
  'invite.emailInvite':    'دعوة بالبريد',
  'invite.usernameInvite': 'دعوة باسم المستخدم',
  'invite.displayName':    'الاسم الكامل',
  'invite.emailAddress':   'البريد الإلكتروني',
  'invite.username':       'اسم المستخدم',
  'invite.role':           'الدور',
  'invite.sendInvite':     'إرسال الدعوة',
  'invite.inviteAnother':  'دعوة شخص آخر',
  'invite.done':           'تم',
  'invite.copyLink':       'نسخ الرابط',
  'invite.copied':         'تم النسخ!',
  'invite.downloadQR':     'تحميل رمز QR',
  'invite.linkExpires':    'تنتهي صلاحية هذا الرابط خلال 7 أيام.',
  'invite.sent':           'تم إرسال الدعوة بالبريد الإلكتروني.',
  'invite.setPermissions': 'تحديد صلاحيات الوصول',
  'invite.hidePermissions':'إخفاء صلاحيات الوصول',

  // ── Superadmin Team ──────────────────────────────────────────────
  'team.title':        'فريق مخزون',
  'team.subtitle':     'أعضاء الفريق الداخلي بصلاحيات المشرف.',
  'team.addMember':    'إضافة عضو',
  'team.editMember':   'تعديل العضو',
  'team.fullName':     'الاسم الكامل',
  'team.email':        'البريد الإلكتروني',
  'team.role':         'الدور',
  'team.status':       'الحالة',
  'team.added':        'تاريخ الإضافة',
  'team.tempPassword': 'كلمة مرور مؤقتة',
  'team.adding':       'جاري الإضافة...',
  'team.deactivate':   'تعطيل',
  'team.reactivate':   'تفعيل',
  'team.delete':       'حذف',
  'team.noResults':    'لا يوجد أعضاء في الفريق.',
  'team.you':          'أنت',
  'team.passwordHint': 'يُرسل للعضو عبر البريد الإلكتروني. يجب عليه تغيير كلمة المرور بعد أول تسجيل دخول.',
  'team.show':         'إظهار',
  'team.hide':         'إخفاء',

  // ── Permissions editor ───────────────────────────────────────────
  'permissions.setAccess':   'تحديد صلاحيات الوصول',
  'permissions.hideAccess':  'إخفاء صلاحيات الوصول',
  'permissions.editAccess':  'تعديل صلاحيات الوصول',
  'permissions.default':     'الوضع الافتراضي: صلاحية عرض فقط.',
  'permissions.defaultAdmin':'جميع الصلاحيات ممكّنة افتراضياً.',

  // ── Superadmin portal ────────────────────────────────────────────
  'superadmin.brandName': 'مخزون',
  'superadmin.portal':    'بوابة المشرف',

  // ── Org portal ───────────────────────────────────────────────────
  'org.search': 'بحث...',
};

export const messages: Record<Locale, Record<keyof typeof en, string>> = { en, ar };
export type MessageKey = keyof typeof en;
