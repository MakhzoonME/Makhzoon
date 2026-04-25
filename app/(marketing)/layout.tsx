import { MarketingHeader } from '@/components/marketing/Header';
import { MarketingFooter } from '@/components/marketing/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
