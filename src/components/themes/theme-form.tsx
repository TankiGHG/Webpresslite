'use client';

import { Check, Paintbrush, X } from 'lucide-react';
import { useActionState, useState } from 'react';
import { ThemePreview } from './theme-preview';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { updateThemeAction, type ActionState } from '@/lib/actions/themes';
import {
  FONT_IDS,
  FONT_LABELS,
  THEMES,
  THEME_IDS,
  resolveTheme,
  type ThemeId,
} from '@/lib/themes/definitions';
import type { ThemeSettings } from '@/lib/themes/settings';
import { cn } from '@/lib/utils';

function FontSelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue ?? ''}>
        <option value="">Theme-Vorgabe</option>
        {FONT_IDS.map((font) => (
          <option key={font} value={font}>
            {FONT_LABELS[font]}
          </option>
        ))}
      </Select>
    </div>
  );
}

function ColorField({
  name,
  label,
  defaultValue,
  fallback,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  /** The theme's own colour, shown as swatch while the field is empty. */
  fallback: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        {/* The swatch doubles as the picker: theme colours are oklch, which a
            native colour input cannot display, so it stays invisible on top. */}
        <span
          className="relative size-9 shrink-0 overflow-hidden rounded-md border shadow-xs"
          style={{ background: isHex ? value : fallback }}
        >
          <input
            type="color"
            aria-label={`${label} auswählen`}
            value={isHex ? value : '#000000'}
            onChange={(event) => setValue(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <Input
          id={name}
          name={name}
          value={value}
          placeholder="Theme-Vorgabe"
          className="font-mono"
          aria-invalid={error ? true : undefined}
          onChange={(event) => setValue(event.target.value)}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${label} auf Theme-Vorgabe zurücksetzen`}
            onClick={() => setValue('')}
          >
            <X />
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
    </div>
  );
}

export function ThemeForm({
  siteId,
  theme,
  settings,
}: {
  siteId: string;
  theme: string;
  settings: ThemeSettings;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateThemeAction, {});
  const [selected, setSelected] = useState<ThemeId>(resolveTheme(theme).id);
  const active = THEMES[selected];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}
      {state.saved ? <Alert variant="success">Design gespeichert.</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Ein Theme ist ein Satz Farben und Schriften. Inhalte bleiben beim Wechsel unberührt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset>
            <legend className="sr-only">Theme</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="theme-choices">
              {THEME_IDS.map((id) => {
                const isSelected = selected === id;
                return (
                  <label
                    key={id}
                    data-testid={`theme-option-${id}`}
                    className={cn(
                      'relative block cursor-pointer rounded-xl border p-3 transition-[border-color,box-shadow] outline-none',
                      'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-[3px]',
                      isSelected
                        ? 'border-primary shadow-[0_0_0_1px_var(--color-primary)]'
                        : 'hover:border-foreground/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={id}
                      checked={isSelected}
                      onChange={() => setSelected(id)}
                      className="sr-only"
                    />
                    <ThemePreview theme={THEMES[id]} />
                    <span className="mt-3 flex items-start justify-between gap-2">
                      <span>
                        <span className="block text-sm font-medium">{THEMES[id].name}</span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {THEMES[id].description}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="bg-primary text-primary-foreground grid size-5 shrink-0 place-items-center rounded-full">
                          <Check className="size-3" aria-hidden />
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Farben</CardTitle>
            <CardDescription>
              Leer lassen, um die Vorgabe von „{active.name}“ zu verwenden. Hex-Werte wie #1a2b3c.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorField
              name="accent"
              label="Akzent"
              defaultValue={settings.accent}
              fallback={active.tokens.accent}
              error={state.errors?.accent}
            />
            <ColorField
              name="background"
              label="Hintergrund"
              defaultValue={settings.background}
              fallback={active.tokens.background}
              error={state.errors?.background}
            />
            <ColorField
              name="foreground"
              label="Text"
              defaultValue={settings.foreground}
              fallback={active.tokens.foreground}
              error={state.errors?.foreground}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schrift</CardTitle>
              <CardDescription>
                Systemschriften — nichts wird nachgeladen, nichts getrackt.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FontSelect name="bodyFont" label="Fließtext" defaultValue={settings.bodyFont} />
              <FontSelect
                name="headingFont"
                label="Überschriften"
                defaultValue={settings.headingFont}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Ohne Logo zeigt der Kopfbereich den Namen der Site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="logoUrl">Logo-URL (https)</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  defaultValue={settings.logoUrl ?? ''}
                  placeholder="https://…"
                  aria-invalid={state.errors?.logoUrl ? true : undefined}
                />
                {state.errors?.logoUrl ? (
                  <p className="text-danger text-sm">{state.errors.logoUrl}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logoAlt">Alt-Text des Logos</Label>
                <Input
                  id="logoAlt"
                  name="logoAlt"
                  defaultValue={settings.logoAlt ?? ''}
                  placeholder="z. B. Name der Site"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? null : <Paintbrush />}
          {pending ? 'Wird gespeichert…' : 'Design speichern'}
        </Button>
      </div>
    </form>
  );
}
