import React from 'react';
import Link from 'next/link';

function ChevronRightSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="space-y-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={item.href}>
                {i > 0 && <ChevronRightSVG />}
                <Link href={item.href} className="hover:text-gray-700 transition-colors">
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
