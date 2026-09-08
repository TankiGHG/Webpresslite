'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

type Preference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'wpl-theme';

function readPreference(): Preference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyPreference(preference: Preference) {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Private mode without storage: the choice just does not persist.
  }
  const dark =
    preference === 'dark' ||
    (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Radio group for the appearance preference, meant for a dropdown menu. */
export function ThemeMenuItems() {
  const [preference, setPreference] = useState<Preference>('system');

  useEffect(() => {
    setPreference(readPreference());
  }, []);

  return (
    <DropdownMenuRadioGroup
      value={preference}
      onValueChange={(value) => {
        const next = value as Preference;
        setPreference(next);
        applyPreference(next);
      }}
    >
      <DropdownMenuRadioItem value="light">
        <Sun className="text-muted-foreground size-4" /> Hell
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon className="text-muted-foreground size-4" /> Dunkel
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <Monitor className="text-muted-foreground size-4" /> System
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}
