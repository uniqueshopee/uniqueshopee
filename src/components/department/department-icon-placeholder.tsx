type DepartmentTone = {
  fill: string;
  ring: string;
  accentRgb: string;
  wash: string;
};

function DepartmentIconPlaceholder({
  initials,
  tone,
  label,
}: {
  initials: string;
  tone: DepartmentTone;
  label: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 72"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-gradient`} x1="8" y1="10" x2="112" y2="62">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="118" height="70" rx="20" fill={`url(#${id}-gradient)`} />
      <path
        d="M18 47C29 38 40 34 54 34C67 34 78 39 92 28"
        stroke={tone.accentRgb}
        strokeOpacity="0.12"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M18 24C31 20 42 18 56 20C71 22 83 28 98 18"
        stroke={tone.accentRgb}
        strokeOpacity="0.1"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="26" cy="52" r="9" fill={tone.wash} />
      <circle cx="96" cy="22" r="8" fill={tone.wash} />
      <rect x="40" y="16" width="40" height="40" rx="14" fill={tone.wash} />
      <text
        x="60"
        y="41"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="currentColor"
        fillOpacity="0.65"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
}

export type { DepartmentTone };
export { DepartmentIconPlaceholder };
