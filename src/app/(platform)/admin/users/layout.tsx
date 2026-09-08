import type { ReactNode } from 'react';
import { PlatformPage } from '@/components/platform/platform-page';

export default function AdminUsersLayout({ children }: { children: ReactNode }) {
  return <PlatformPage returnTo="/admin/users">{children}</PlatformPage>;
}
