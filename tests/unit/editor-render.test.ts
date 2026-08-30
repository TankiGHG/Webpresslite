import { describe, expect, it } from 'vitest';
import { contentToText, deriveExcerpt, renderContent } from '@/lib/editor/render';
import type { JSONContent } from '@/lib/editor/types';

function doc(...content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

function paragraph(text: string, marks?: JSONContent['marks']): JSONContent {
  return { type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] };
}

describe('renderContent', () => {
  it('renders paragraphs and headings', () => {
    const html = renderContent(
      doc(
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Titel' }] },
        paragraph('Ein Absatz.'),
      ),
    );

    expect(html).toContain('<h2>Titel</h2>');
    expect(html).toContain('<p>Ein Absatz.</p>');
  });

  it('renders marks, quotes, lists and code blocks', () => {
    const html = renderContent(
      doc(
        paragraph('fett', [{ type: 'bold' }]),
        { type: 'blockquote', content: [paragraph('Zitat')] },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [paragraph('Punkt')] }],
        },
        { type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1;' }] },
      ),
    );

    expect(html).toContain('<strong>fett</strong>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<li>');
    expect(html).toContain('const a = 1;');
  });

  it('escapes text that looks like markup', () => {
    const html = renderContent(doc(paragraph('<script>alert(1)</script>')));

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops a smuggled raw html node', () => {
    // A document does not have to come from our editor - it could be posted
    // straight at the server action.
    const html = renderContent(
      doc(
        { type: 'paragraph', content: [{ type: 'text', text: 'ok' }] },
        {
          type: 'image',
          attrs: { src: 'https://example.com/a.png', onerror: 'alert(1)' },
        },
      ),
    );

    expect(html).not.toContain('onerror');
    expect(html).toContain('ok');
  });

  it('strips a javascript: link but keeps its text', () => {
    const html = renderContent(
      doc(paragraph('klick', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])),
    );

    expect(html).not.toContain('javascript:');
    expect(html).toContain('klick');
  });

  it('keeps a data: image out', () => {
    const html = renderContent(
      doc({ type: 'image', attrs: { src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' } }),
    );

    expect(html).not.toContain('data:image');
  });

  it('forces rel on every link', () => {
    const html = renderContent(
      doc(paragraph('extern', [{ type: 'link', attrs: { href: 'https://example.com' } }])),
    );

    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('renders an empty document without throwing', () => {
    expect(renderContent({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('<p></p>');
  });
});

describe('contentToText', () => {
  it('joins text across blocks with spaces', () => {
    const text = contentToText(doc(paragraph('Erster Satz.'), paragraph('Zweiter Satz.')));

    expect(text).toBe('Erster Satz. Zweiter Satz.');
  });

  it('returns an empty string for an empty document', () => {
    expect(contentToText({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
  });
});

describe('deriveExcerpt', () => {
  it('returns short text unchanged', () => {
    expect(deriveExcerpt(doc(paragraph('Kurz.')))).toBe('Kurz.');
  });

  it('truncates on a word boundary and appends an ellipsis', () => {
    const long = `${'wort '.repeat(80)}`.trim();
    const excerpt = deriveExcerpt(doc(paragraph(long)), 50);

    expect(excerpt.length).toBeLessThanOrEqual(51);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt).not.toContain('  ');
  });
});
