'use client';

import { ChevronsUpDown, LogOut, Palette, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
import { ThemeMenuItems } from './theme-menu-items';

export interface UserMenuProps {
  name: string;
  email: string;
  isPlatformAdmin?: boolean;
  /** `wide` shows name and email next to the avatar (sidebar footer). */
  layout?: 'compact' | 'wide';
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
}

export function UserMenu({
  name,
  email,
  isPlatformAdmin = false,
  layout = 'compact',
  align = 'end',
  side = 'bottom',
}: UserMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Benutzermenü"
        data-testid="user-menu"
        className={cn(
          'focus-visible:ring-ring flex items-center gap-2.5 rounded-lg text-left transition-colors outline-none focus-visible:ring-[3px]',
          layout === 'wide'
            ? 'hover:bg-accent data-[state=open]:bg-accent w-full px-2 py-2'
            : 'rounded-full hover:opacity-90',
        )}
      >
        <Avatar name={name} seed={email} size={layout === 'wide' ? 'md' : 'sm'} />
        {layout === 'wide' ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="text-muted-foreground block truncate text-xs">{email}</span>
            </span>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="text-foreground block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> Profil
          </Link>
        </DropdownMenuItem>
        {isPlatformAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/users">
              <Shield /> Nutzerverwaltung
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="size-3.5" /> Darstellung
        </DropdownMenuLabel>
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          disabled={signingOut}
          onSelect={async (event) => {
            event.preventDefault();
            setSigningOut(true);
            await signOut();
            router.push('/login');
            router.refresh();
          }}
        >
          <LogOut /> {signingOut ? 'Abmelden…' : 'Abmelden'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
