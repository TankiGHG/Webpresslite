import { Badge, StatusDot } from '@/components/ui/badge';
import { POST_STATUS_LABELS, type PostStatus } from '@/lib/posts/constants';

const VARIANTS: Record<PostStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  scheduled: 'warning',
  draft: 'neutral',
};

export function PostStatusBadge({
  status,
  className,
  ...props
}: { status: PostStatus; className?: string } & Record<`data-${string}`, string | undefined>) {
  return (
    <Badge variant={VARIANTS[status]} className={className} data-status={status} {...props}>
      <StatusDot />
      {POST_STATUS_LABELS[status]}
    </Badge>
  );
}
