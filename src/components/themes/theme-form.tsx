'use client';

import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function FontSelect({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {FONT_IDS.map((font) => (
          <option key={font} value={font}>
            {FONT_LABELS[font]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorField({
  name,
  label,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={name}
          name={name}
          value={value}
          placeholder="Theme-Vorgabe"
          aria-invalid={error ? true : undefined}
          onChange={(event) => setValue(event.target.value)}
        />
        <input
          type="color"
          aria-label={`${label} auswählen`}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Leer lassen, um die Vorgabe des Themes zu verwenden.
      </p>
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

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}
      {state.saved ? <Alert variant="success">Design gespeichert.</Alert> : null}

      <fieldset className="space-y-3">
        <legend className="font-medium">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-3" data-testid="theme-choices">
          {THEME_IDS.map((id) => (
            <label
              key={id}
              data-testid={`theme-option-${id}`}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                selected === id ? 'border-[var(--color-primary)] bg-[var(--color-muted)]' : ''
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={id}
                checked={selected === id}
                onChange={() => setSelected(id)}
                className="sr-only"
              />
              <span className="block font-medium">{THEMES[id].name}</span>
              <span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">
                {THEMES[id].description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-medium">Farben</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField
            name="accent"
            label="Akzent"
            defaultValue={settings.accent}
            error={state.errors?.accent}
          />
          <ColorField
            name="background"
            label="Hintergrund"
            defaultValue={settings.background}
            error={state.errors?.background}
          />
          <ColorField
            name="foreground"
            label="Text"
            defaultValue={settings.foreground}
            error={state.errors?.foreground}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-medium">Schrift</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FontSelect
            name="bodyFont"
            label="Fließtext"
            defaultValue={settings.bodyFont}
            placeholder="Theme-Vorgabe"
          />
          <FontSelect
            name="headingFont"
            label="Überschriften"
            defaultValue={settings.headingFont}
            placeholder="Theme-Vorgabe"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-medium">Logo</legend>
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
            <p className="text-sm text-red-700">{state.errors.logoUrl}</p>
          ) : null}
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Ohne Logo zeigt der Kopfbereich den Namen der Site.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="logoAlt">Alt-Text des Logos</Label>
          <Input id="logoAlt" name="logoAlt" defaultValue={settings.logoAlt ?? ''} />
        </div>
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird gespeichert…' : 'Design speichern'}
      </Button>
    </form>
  );
}
