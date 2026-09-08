import type { ReactNode } from 'react';
import { PlatformPage } from '@/components/platform/platform-page';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <PlatformPage returnTo="/profile" width="narrow">
      {children}
    </PlatformPage>
  );
}
