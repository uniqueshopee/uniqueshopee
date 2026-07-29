type CategoryTone = {
  ring: string;
  fill: string;
  accentRgb: string;
  wash: string;
};

type CategoryScene =
  | "living-room"
  | "house"
  | "bucket"
  | "wall"
  | "roof"
  | "wood"
  | "metal"
  | "tools"
  | "pipes"
  | "pipes-cold"
  | "fittings"
  | "faucet"
  | "valve"
  | "pump"
  | "tank"
  | "bathroom";

function CategoryIllustration({
  label,
  scene,
  tone,
}: {
  label: string;
  scene: CategoryScene;
  tone: CategoryTone;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 72"
      className="h-full w-full drop-shadow-[0_12px_18px_rgba(16,33,58,0.08)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-gradient`} x1="8" y1="8" x2="112" y2="64">
          <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="118" height="70" rx="20" fill={`url(#${id}-gradient)`} />
      <ellipse cx="60" cy="61" rx="34" ry="4.5" fill="rgba(16,33,58,0.05)" />
      <path
        d="M16 50C28 40 44 36 60 38C76 40 88 36 104 24"
        stroke={tone.accentRgb}
        strokeOpacity="0.16"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
      <path
        d="M20 22C31 18 43 16 56 19C69 22 79 28 96 18"
        stroke={tone.accentRgb}
        strokeOpacity="0.1"
        strokeWidth="5.25"
        strokeLinecap="round"
      />
      <circle cx="25" cy="52" r="9" fill={tone.wash} />
      <circle cx="94" cy="20" r="8" fill={tone.wash} />
      <circle cx="102" cy="50" r="4" fill={`color-mix(in srgb, ${tone.accentRgb} 18%, white)`} />

      {scene === "living-room" && (
        <>
          <rect x="20" y="33" width="80" height="19" rx="10" fill={tone.wash} />
          <rect x="31" y="28" width="20" height="12" rx="4" fill="rgba(255,255,255,0.95)" stroke={tone.accentRgb} strokeOpacity="0.2" />
          <rect x="50" y="24" width="36" height="18" rx="7" fill="rgba(255,255,255,0.95)" stroke={tone.accentRgb} strokeOpacity="0.18" />
          <rect x="86" y="31" width="10" height="16" rx="5" fill={tone.wash} />
          <path d="M34 43H79" stroke="rgba(255,255,255,0.88)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {scene === "house" && (
        <>
          <path d="M31 44V31L60 16L89 31V44H31Z" fill={tone.wash} />
          <path d="M40 44V35H80V44" stroke={tone.accentRgb} strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
          <rect x="49" y="33" width="22" height="12" rx="4" fill="rgba(255,255,255,0.95)" />
          <rect x="35" y="39" width="11" height="5" rx="2.5" fill="rgba(255,255,255,0.72)" />
        </>
      )}

      {scene === "bucket" && (
        <>
          <path d="M42 28H78L74 49H46L42 28Z" fill={tone.wash} />
          <path d="M46 28C49 20 71 20 74 28" stroke={tone.accentRgb} strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round" />
          <rect x="48" y="34" width="20" height="8" rx="3" fill="rgba(255,255,255,0.96)" />
          <path d="M48 39H68" stroke={tone.accentRgb} strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {scene === "wall" && (
        <>
          <rect x="26" y="26" width="68" height="20" rx="8" fill={tone.wash} />
          <path d="M32 34H88" stroke={tone.accentRgb} strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
          <path d="M38 39H82" stroke={tone.accentRgb} strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="20" r="4" fill="rgba(255,255,255,0.94)" />
        </>
      )}

      {scene === "roof" && (
        <>
          <path d="M30 44L60 24L90 44" fill={tone.wash} />
          <path d="M38 44V32H82V44" fill="rgba(255,255,255,0.88)" stroke={tone.accentRgb} strokeOpacity="0.2" strokeWidth="3" />
          <circle cx="82" cy="24" r="6" fill={tone.wash} />
          <path d="M73 20C76 22 78 26 78 30" stroke={tone.accentRgb} strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {scene === "wood" && (
        <>
          <rect x="30" y="28" width="60" height="20" rx="8" fill={tone.wash} />
          <rect x="36" y="32" width="48" height="4" rx="2" fill="rgba(255,255,255,0.92)" />
          <rect x="36" y="39" width="34" height="4" rx="2" fill="rgba(255,255,255,0.72)" />
          <path d="M40 44C50 36 60 34 82 35" stroke={tone.accentRgb} strokeOpacity="0.12" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {scene === "metal" && (
        <>
          <rect x="30" y="27" width="60" height="18" rx="9" fill={tone.wash} />
          <path d="M42 36H78" stroke="rgba(255,255,255,0.94)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M52 30L68 42" stroke={tone.accentRgb} strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
          <circle cx="34" cy="36" r="3.5" fill="rgba(255,255,255,0.88)" />
        </>
      )}

      {scene === "tools" && (
        <>
          <rect x="36" y="28" width="18" height="20" rx="7" fill={tone.wash} />
          <rect x="60" y="24" width="18" height="24" rx="8" fill="rgba(255,255,255,0.9)" stroke={tone.accentRgb} strokeOpacity="0.18" />
          <path d="M44 32L46 44" stroke={tone.accentRgb} strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
          <path d="M67 30H77" stroke={tone.accentRgb} strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {scene === "pipes" && (
        <>
          <path d="M32 38H88" stroke={tone.accentRgb} strokeOpacity="0.2" strokeWidth="7" strokeLinecap="round" />
          <circle cx="40" cy="38" r="6" fill="rgba(255,255,255,0.92)" />
          <circle cx="78" cy="38" r="6" fill={tone.wash} />
          <circle cx="60" cy="27" r="4" fill="rgba(255,255,255,0.88)" />
        </>
      )}

      {scene === "pipes-cold" && (
        <>
          <path d="M34 28H64C72 28 78 34 78 42V48" stroke={tone.accentRgb} strokeOpacity="0.2" strokeWidth="7" strokeLinecap="round" />
          <path d="M64 28H92" stroke="rgba(255,255,255,0.92)" strokeWidth="7" strokeLinecap="round" />
          <circle cx="78" cy="48" r="4" fill={tone.wash} />
        </>
      )}

      {scene === "fittings" && (
        <>
          <path d="M34 44L52 26H68L86 44L68 62H52L34 44Z" fill={tone.wash} />
          <circle cx="60" cy="44" r="10" fill="rgba(255,255,255,0.9)" />
          <circle cx="60" cy="44" r="4" fill={tone.accentRgb} fillOpacity="0.18" />
        </>
      )}

      {scene === "faucet" && (
        <>
          <path d="M36 28H58V36H70C78 36 84 42 84 50" stroke={tone.accentRgb} strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M48 36V46H64" stroke="rgba(255,255,255,0.92)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="79" cy="53" r="5" fill={tone.wash} />
          <path d="M74 26H84" stroke="rgba(255,255,255,0.88)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {scene === "valve" && (
        <>
          <circle cx="60" cy="36" r="12" fill={tone.wash} />
          <path d="M60 24V48M48 36H72" stroke="rgba(255,255,255,0.94)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="36" r="4" fill={tone.accentRgb} fillOpacity="0.18" />
        </>
      )}

      {scene === "pump" && (
        <>
          <rect x="34" y="28" width="48" height="22" rx="10" fill={tone.wash} />
          <circle cx="60" cy="39" r="8" fill="rgba(255,255,255,0.94)" />
          <path d="M82 34L92 28" stroke={tone.accentRgb} strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
          <path d="M41 31H51" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {scene === "tank" && (
        <>
          <rect x="38" y="24" width="44" height="28" rx="12" fill={tone.wash} />
          <path d="M46 32H74M46 39H74" stroke="rgba(255,255,255,0.92)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="22" r="3.5" fill="rgba(255,255,255,0.88)" />
        </>
      )}

      {scene === "bathroom" && (
        <>
          <rect x="36" y="28" width="20" height="18" rx="8" fill={tone.wash} />
          <rect x="60" y="26" width="24" height="8" rx="4" fill="rgba(255,255,255,0.92)" />
          <path d="M72 34V48" stroke={tone.accentRgb} strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
          <circle cx="84" cy="42" r="4" fill={tone.wash} />
          <path d="M40 48H54" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export type { CategoryScene, CategoryTone };
export { CategoryIllustration };
