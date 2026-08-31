import type { DailyViews } from '@/lib/db/queries/stats';

/**
 * Daily views as columns, rendered server side as inline SVG.
 *
 * Columns rather than a line: these are discrete counts per day, and a line
 * would draw values between days that were never measured. One series, so one
 * hue and no legend — the heading names what is plotted.
 */
const WIDTH = 720;
const HEIGHT = 180;
const PADDING = { top: 8, right: 4, bottom: 22, left: 4 };
const MAX_BAR_WIDTH = 24;
const SURFACE_GAP = 2;
const RADIUS = 4;

function formatDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}.${month}.`;
}

export function ViewsChart({ data }: { data: DailyViews[] }) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const max = Math.max(1, ...data.map((entry) => entry.views));
  const band = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(2, band - SURFACE_GAP));

  const baseline = PADDING.top + plotHeight;
  const total = data.reduce((sum, entry) => sum + entry.views, 0);

  // Label only the ends and the peak: a number on every bar is noise.
  const peakIndex = data.reduce(
    (best, entry, index) => (entry.views > (data[best]?.views ?? 0) ? index : best),
    0,
  );
  const labelled = new Set([0, data.length - 1, peakIndex]);

  return (
    <figure className="stats-figure">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Seitenaufrufe der letzten ${data.length} Tage, insgesamt ${total}`}
        data-testid="views-chart"
        preserveAspectRatio="none"
      >
        {/* A single hairline baseline; no grid, nothing to read against. */}
        <line
          x1={PADDING.left}
          y1={baseline + 0.5}
          x2={WIDTH - PADDING.right}
          y2={baseline + 0.5}
          className="stats-axis"
        />

        {data.map((entry, index) => {
          const height = entry.views === 0 ? 0 : Math.max(2, (entry.views / max) * plotHeight);
          const x = PADDING.left + index * band + (band - barWidth) / 2;
          const y = baseline - height;
          const radius = Math.min(RADIUS, height / 2, barWidth / 2);

          return (
            <g key={entry.day}>
              {height > 0 ? (
                // Rounded at the data end, square at the baseline.
                <path
                  d={`M ${x} ${baseline} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + barWidth - radius} ${y} Q ${x + barWidth} ${y} ${x + barWidth} ${y + radius} L ${x + barWidth} ${baseline} Z`}
                  className="stats-bar"
                >
                  <title>{`${formatDay(entry.day)}: ${entry.views} Aufrufe`}</title>
                </path>
              ) : (
                <rect
                  x={x}
                  y={baseline - 1}
                  width={barWidth}
                  height={1}
                  className="stats-bar-empty"
                >
                  <title>{`${formatDay(entry.day)}: keine Aufrufe`}</title>
                </rect>
              )}

              {labelled.has(index) ? (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  className="stats-label"
                >
                  {formatDay(entry.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <figcaption className="sr-only">
        Balkendiagramm der täglichen Seitenaufrufe über {data.length} Tage.
      </figcaption>
    </figure>
  );
}
