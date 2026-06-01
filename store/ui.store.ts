'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  superAdminSidebarCollapsed: boolean;
  toggleSuperAdminSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  /* Page header — set by PageHeader, read by AppHeader */
  headerTitle: string;
  headerBreadcrumb: BreadcrumbItem[];
  setPageHeader: (title: string, breadcrumb?: BreadcrumbItem[]) => void;
  clearPageHeader: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      superAdminSidebarCollapsed: false,
      toggleSuperAdminSidebar: () => set((s) => ({ superAdminSidebarCollapsed: !s.superAdminSidebarCollapsed })),
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      headerTitle: '',
      headerBreadcrumb: [],
      setPageHeader: (title, breadcrumb = []) => set({ headerTitle: title, headerBreadcrumb: breadcrumb }),
      clearPageHeader: () => set({ headerTitle: '', headerBreadcrumb: [] }),
    }),
    {
      name: 'ui-state',
      storage: createJSONStorage(() => localStorage),
      /* Don't persist header state — it's derived from the current page */
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        superAdminSidebarCollapsed: s.superAdminSidebarCollapsed,
      }),
    }
  )
);
