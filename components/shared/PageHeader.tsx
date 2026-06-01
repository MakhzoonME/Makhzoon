'use client';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUiStore } from '@/store/ui.store';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  const { setPageHeader, clearPageHeader } = useUiStore();

  useEffect(() => {
    setPageHeader(title, breadcrumb ?? []);
    return () => clearPageHeader();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(breadcrumb)]);

  /* Portal actions into the header slot — null-safe for SSR */
  const actionsPortal =
    actions && typeof document !== 'undefined'
      ? ReactDOM.createPortal(
          <div className="flex items-center gap-2">{actions}</div>,
          document.getElementById('header-actions-slot') ?? document.body,
        )
      : null;

  return (
    <>
      {actionsPortal}
      {description && (
        <p className="t-body muted mb-6">{description}</p>
      )}
    </>
  );
}
