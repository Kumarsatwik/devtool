/**
 * DataTools brand mark: data node framed by code brackets.
 * Monochrome (currentColor) so it adapts to any theme/container.
 */
export function DataToolsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M9 5 4.5 12 9 19"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 5l4.5 7L15 19"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9.9" y="9.9" width="4.2" height="4.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}
