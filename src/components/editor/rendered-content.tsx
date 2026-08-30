/**
 * Renders stored post HTML. The string is produced and sanitized on the server
 * in `lib/editor/render.ts`; nothing that reaches here comes straight from a
 * client.
 */
export function RenderedContent({ html }: { html: string }) {
  return (
    <div
      className="post-content"
      data-testid="post-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
