'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
        router.push('/login');
        router.refresh();
      }}
    >
      {pending ? 'Abmelden…' : 'Abmelden'}
    </Button>
  );
}
