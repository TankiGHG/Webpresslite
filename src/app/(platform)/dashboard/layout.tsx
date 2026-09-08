import type { ReactNode } from 'react';
import { PlatformPage } from '@/components/platform/platform-page';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <PlatformPage returnTo="/dashboard">{children}</PlatformPage>;
}
