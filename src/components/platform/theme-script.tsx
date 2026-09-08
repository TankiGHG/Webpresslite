import { headers } from 'next/headers';

/**
 * Resolves the stored colour preference into `data-theme` before first paint.
 * Inline, so it runs before any CSS is applied; nonced, so the CSP allows it.
 */
const BOOTSTRAP = `(function(){try{var t=localStorage.getItem('wpl-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />;
}
