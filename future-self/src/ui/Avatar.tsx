import { Character, Dream } from '../engine/profile';

/**
 * Original portrait-style character (head and shoulders), modestly dressed with a high collar.
 * Small badges appear as the person levels up — earned by planning and learning, never by money.
 */
export function Avatar({ c, level = 1, size = 160, frame = true }: { c: Character; level?: number; size?: number; frame?: boolean }) {
  const H = c.hair;
  const scarf = c.headwear === 'scarf';
  const id = `av${Math.round(size)}${c.skin.slice(1)}`;
  return (
    <svg viewBox="0 0 160 200" width={size * 0.8} height={size} role="img" aria-label={`Your character, level ${level}`} className="block">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f6f1" />
          <stop offset="1" stopColor="#e3ece4" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <rect x="0" y="0" width="160" height="200" rx="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        {frame && <rect width="160" height="200" fill={`url(#${id}bg)`} />}
        {/* long hair behind shoulders */}
        {!scarf && c.hairStyle === 'long' && <path d="M34 70 Q30 40 80 26 Q130 40 126 70 L132 178 L28 178 Z" fill={H} />}
        {!scarf && c.hairStyle === 'curly' && (
          <g fill={H}>
            {[[44, 56], [58, 40], [80, 34], [102, 40], [116, 56], [122, 76], [38, 76], [40, 96], [120, 96]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="17" />
            ))}
          </g>
        )}
        {/* shoulders & high-collared top */}
        <path d="M14 200 Q16 150 52 140 L108 140 Q144 150 146 200 Z" fill={c.outfit} />
        <path d="M60 136 L80 152 L100 136 L100 146 L80 160 L60 146 Z" fill="rgba(255,255,255,0.18)" />
        <path d="M40 160 Q46 178 44 200 M120 160 Q114 178 116 200" stroke="rgba(0,0,0,0.12)" strokeWidth="4" fill="none" />
        {/* neck */}
        <rect x="68" y="112" width="24" height="30" rx="8" fill={c.skin} />
        <rect x="68" y="128" width="24" height="10" fill="rgba(0,0,0,0.08)" />
        {/* scarf drapes over shoulders */}
        {scarf && <path d="M30 70 Q28 22 80 20 Q132 22 130 70 Q134 120 116 150 L44 150 Q26 120 30 70 Z" fill={c.accent} />}
        {/* face */}
        <ellipse cx="80" cy="82" rx="36" ry="40" fill={c.skin} />
        {!scarf && (
          <>
            <ellipse cx="44" cy="86" rx="6" ry="9" fill={c.skin} />
            <ellipse cx="116" cy="86" rx="6" ry="9" fill={c.skin} />
          </>
        )}
        {/* hair front */}
        {!scarf && c.hairStyle !== 'curly' && (
          <path
            d={
              c.hairStyle === 'short'
                ? 'M44 72 Q42 40 80 38 Q118 40 116 72 Q108 54 80 54 Q54 54 44 72 Z'
                : c.hairStyle === 'bob'
                  ? 'M38 96 Q30 40 80 36 Q130 40 122 96 L114 96 Q116 60 98 52 Q70 62 46 60 Q44 80 46 96 Z'
                  : 'M42 84 Q38 38 80 36 Q122 38 118 84 Q112 56 96 52 Q74 62 48 58 Q44 70 42 84 Z'
            }
            fill={H}
          />
        )}
        {!scarf && c.hairStyle === 'curly' && <path d="M46 70 Q50 46 80 44 Q110 46 114 70 Q100 56 80 58 Q60 56 46 70 Z" fill={H} />}
        {!scarf && c.hairStyle === 'bun' && <circle cx="80" cy="28" r="14" fill={H} />}
        {c.headwear === 'cap' && (
          <g fill={c.accent}>
            <path d="M44 62 Q46 34 80 34 Q114 34 116 62 Z" />
            <path d="M80 58 L128 62 Q120 68 80 66 Z" />
          </g>
        )}
        {c.headwear === 'kufi' && <path d="M48 58 Q50 38 80 38 Q110 38 112 58 Z" fill={c.accent} />}
        {/* brows, eyes, glasses */}
        <path d="M58 70 Q66 66 72 69 M88 69 Q94 66 102 70" stroke="#2a2a2a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="66" cy="82" r="6" fill="#fff" />
        <circle cx="94" cy="82" r="6" fill="#fff" />
        <circle cx="67" cy="83" r="3.4" fill="#2a2a2a" />
        <circle cx="95" cy="83" r="3.4" fill="#2a2a2a" />
        <circle cx="68.2" cy="81.6" r="1.1" fill="#fff" />
        <circle cx="96.2" cy="81.6" r="1.1" fill="#fff" />
        {c.glasses && (
          <g stroke="#2a3a33" strokeWidth="2.2" fill="none">
            <rect x="55" y="73" width="22" height="18" rx="7" />
            <rect x="83" y="73" width="22" height="18" rx="7" />
            <path d="M77 81 L83 81" />
          </g>
        )}
        {/* cheeks, nose, mouth */}
        <ellipse cx="57" cy="96" rx="7" ry="4" fill="#e88a8a" opacity="0.28" />
        <ellipse cx="103" cy="96" rx="7" ry="4" fill="#e88a8a" opacity="0.28" />
        <path d="M80 86 Q77 95 81 97" stroke="rgba(0,0,0,0.25)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M70 104 Q80 111 90 104" stroke="#a35454" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {/* level badges (earned through actions) */}
        {level >= 3 && <circle cx="116" cy="168" r="7" fill="#d4a04a" stroke="#fff" strokeWidth="2" aria-label="Planner badge" />}
        {level >= 5 && <path d="M44 160 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill="#fff" opacity="0.9" aria-label="Navigator star" />}
      </g>
    </svg>
  );
}

const SCENE: Record<Dream['theme'], { label: string; icon: string }> = {
  home: { label: 'Home', icon: 'M-26 6 L0 -18 L26 6 L20 6 L20 26 L-20 26 L-20 6 Z M-6 26 L-6 12 L6 12 L6 26 Z' },
  travel: { label: 'Travel', icon: 'M-30 10 L30 -6 L34 0 L8 8 L0 26 L-6 24 L-2 10 L-22 16 L-28 24 L-32 22 L-26 12 Z' },
  study: { label: 'Study', icon: 'M-30 -6 L0 -20 L30 -6 L0 8 Z M-18 0 L-18 16 Q0 26 18 16 L18 0 L0 8 Z' },
  business: { label: 'Business', icon: 'M-26 -6 L26 -6 L26 26 L-26 26 Z M-10 -6 L-10 -16 L10 -16 L10 -6' },
  garden: { label: 'Garden', icon: 'M0 26 L0 0 M0 4 Q-20 -2 -22 -20 Q-4 -18 0 0 M0 8 Q18 4 22 -14 Q4 -14 0 4' },
  family: { label: 'Family', icon: 'M-16 -8 A8 8 0 1 0 -16 -7.9 M16 -8 A8 8 0 1 0 16 -7.9 M-30 26 Q-30 6 -16 6 Q-2 6 -2 26 Z M2 26 Q2 6 16 6 Q30 6 30 26 Z' },
  city: { label: 'City', icon: 'M-30 26 L-30 -4 L-14 -4 L-14 26 M-10 26 L-10 -20 L8 -20 L8 26 M12 26 L12 2 L30 2 L30 26' },
};

export const DREAM_THEMES = Object.entries(SCENE).map(([v, s]) => ({ v: v as Dream['theme'], label: s.label }));

/** Hero scene: forest field, sun and hill — the sun rises as the person completes real actions. */
export function DreamHero({ dream, progress, children }: { dream: Dream; progress: number; children?: React.ReactNode }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest to-[#3d6150] text-white">
      {dream.imageDataUrl ? (
        <img src={dream.imageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      ) : (
        <svg viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="470" cy={150 - p * 70} r="120" fill="#d9ce9f" />
          <path d="M240 260 Q330 150 470 150 Q600 150 640 260 Z" fill="#80a58b" />
          <g transform={`translate(470 ${170 - p * 70}) scale(1.4)`} fill="none" stroke="#294337" strokeOpacity="0.55" strokeWidth="2.4" strokeLinejoin="round">
            <path d={SCENE[dream.theme].icon} />
          </g>
        </svg>
      )}
      <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-6 p-5 sm:p-6">{children}</div>
    </div>
  );
}
