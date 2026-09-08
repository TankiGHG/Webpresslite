'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function CopyButton({ value, label = 'Kopieren' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? 'Kopiert' : label}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard access can be denied; nothing sensible to do but stay quiet.
            }
          }}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'Kopiert' : label}</TooltipContent>
    </Tooltip>
  );
}
