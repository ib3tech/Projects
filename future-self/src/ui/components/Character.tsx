import { Character as C, Dream } from '../../engine/profile';

/**
 * Original, modestly dressed characters (long sleeves, full-length clothing).
 * Accessories unlock with level — earned by planning, learning and consistency only.
 */
export function CharacterSvg({ c, level, size = 160 }: { c: C; level: number; size?: number }) {
  const female = c.gender === 'female';
  const shade = 'rgba(0,0,0,0.14)';
  return (
    <svg viewBox="0 0 120 200" width={size * 0.6} height={size} role="img" aria-label={`Your ${female ? 'female' : 'male'} character, level ${level}`}>
      {/* ground shadow */}
      <ellipse cx="60" cy="192" rx="34" ry="5" fill={shade} />
      {/* legs / long skirt */}
      {female ? (
        <path d="M36 112 L84 112 L94 188 L26 188 Z" fill={c.outfit} />
      ) : (
        <g fill="#3b3f4a">
          <rect x="42" y="112" width="15" height="74" rx="5" />
          <rect x="63" y="112" width="15" height="74" rx="5" />
        </g>
      )}
      {/* shoes */}
      <g fill="#2a2a2a">
        <rect x={female ? 38 : 40} y="184" width="19" height="7" rx="3.5" />
        <rect x={female ? 63 : 61} y="184" width="19" height="7" rx="3.5" />
      </g>
      {/* torso, long sleeves */}
      <path d="M38 62 Q60 54 82 62 L86 116 L34 116 Z" fill={female ? c.outfit : c.outfit} />
      {!female && <rect x="56" y="62" width="8" height="52" fill={c.accent} opacity="0.35" />}
      <path d="M38 64 Q26 80 28 112 L37 112 Q36 88 44 72 Z" fill={c.outfit} />
      <path d="M82 64 Q94 80 92 112 L83 112 Q84 88 76 72 Z" fill={c.outfit} />
      {/* hands */}
      <circle cx="32" cy="114" r="5" fill={c.skin} />
      <circle cx="88" cy="114" r="5" fill={c.skin} />
      {/* belt / sash */}
      <rect x="35" y="104" width="50" height="6" rx="3" fill={c.accent} />
      {/* neck & head */}
      <rect x="54" y="48" width="12" height="12" rx="4" fill={c.skin} />
      {c.headwear === 'scarf' ? (
        <>
          <path d="M36 40 Q36 12 60 12 Q84 12 84 40 Q86 60 72 66 L48 66 Q34 60 36 40 Z" fill={c.accent} />
          <ellipse cx="60" cy="38" rx="17" ry="19" fill={c.skin} />
        </>
      ) : (
        <>
          <ellipse cx="60" cy="36" rx="18" ry="20" fill={c.skin} />
          {female ? (
            <path d="M41 36 Q40 14 60 14 Q80 14 79 36 Q78 26 66 22 Q56 28 42 30 Z M40 34 Q38 54 44 58 L46 36 Z M80 34 Q82 54 76 58 L74 36 Z" fill={c.hair} />
          ) : (
            <path d="M42 32 Q42 15 60 15 Q78 15 78 32 Q74 22 60 22 Q48 22 42 32 Z" fill={c.hair} />
          )}
          {c.headwear === 'cap' && <path d="M41 28 Q42 12 60 12 Q78 12 79 28 Z M60 26 L88 28 L60 30 Z" fill={c.accent} />}
          {c.headwear === 'kufi' && <path d="M43 26 Q44 14 60 14 Q76 14 77 26 Z" fill={c.accent} />}
        </>
      )}
      {/* face */}
      <circle cx="53" cy="38" r="1.8" fill="#222" />
      <circle cx="67" cy="38" r="1.8" fill="#222" />
      <path d="M54 46 Q60 50 66 46" stroke="#222" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* level accessories (earned through actions) */}
      {level >= 2 && (
        <g aria-label="Book: learning">
          <rect x="84" y="100" width="14" height="18" rx="2" fill="#4a6fa5" />
          <rect x="86" y="102" width="10" height="2" fill="#fff" opacity="0.7" />
        </g>
      )}
      {level >= 3 && <circle cx="72" cy="74" r="4" fill="#e0b84f" stroke="#fff" strokeWidth="1.2" aria-label="Planner badge" />}
      {level >= 4 && (
        <g aria-label="Satchel: builder">
          <path d="M40 64 L80 104" stroke="#6b4a2f" strokeWidth="3" />
          <rect x="74" y="98" width="14" height="12" rx="2" fill="#8a5d3b" />
        </g>
      )}
      {level >= 5 && (
        <g aria-label="Compass: navigator">
          <circle cx="24" cy="110" r="7" fill="#fff" stroke="#c49a2c" strokeWidth="2" />
          <path d="M24 105 L26 110 L24 115 L22 110 Z" fill="#c0392b" />
        </g>
      )}
      {level >= 7 && <path d="M60 2 L63 9 L70 9 L64 13 L66 20 L60 16 L54 20 L56 13 L50 9 L57 9 Z" fill="#e0b84f" aria-label="Star: pathfinder" />}
    </svg>
  );
}

const THEMES: Record<Dream['theme'], { sky: string; ground: string; label: string }> = {
  home: { sky: '#cfe8f7', ground: '#9ccc8a', label: 'Home' },
  travel: { sky: '#ffe1b8', ground: '#e8c77e', label: 'Travel' },
  study: { sky: '#dfe3fb', ground: '#b7c3a6', label: 'Study' },
  business: { sky: '#d9eef0', ground: '#a5b8b4', label: 'Business' },
  garden: { sky: '#d8f1dc', ground: '#7fbf6a', label: 'Garden' },
  family: { sky: '#fde6ea', ground: '#a9d19a', label: 'Family' },
  city: { sky: '#d6dcef', ground: '#9aa3b2', label: 'City' },
};

export const DREAM_THEMES = Object.entries(THEMES).map(([v, t]) => ({ v: v as Dream['theme'], label: t.label }));

/** Editable dream scene. `stage` (0–5) adds detail as the user completes real actions. */
export function DreamScene({ dream, stage }: { dream: Dream; stage: number }) {
  if (dream.imageDataUrl) {
    return (
      <div className="dream-img">
        <img src={dream.imageDataUrl} alt={dream.title || 'Your dream'} />
      </div>
    );
  }
  const t = THEMES[dream.theme];
  return (
    <svg viewBox="0 0 320 160" className="dream-svg" role="img" aria-label={`Dream scene: ${dream.title || t.label}`}>
      <rect width="320" height="160" fill={t.sky} />
      <circle cx="270" cy="34" r="16" fill="#ffd46b" opacity={0.5 + stage * 0.1} />
      <path d="M0 120 Q80 100 160 118 T320 112 L320 160 L0 160 Z" fill={t.ground} />
      {dream.theme === 'home' && (
        <g>
          <rect x="120" y="70" width="80" height="54" fill="#f4efe6" stroke="#8a7b66" />
          <path d="M112 72 L160 38 L208 72 Z" fill="#b85c38" />
          <rect x="152" y="96" width="16" height="28" fill="#6b4a2f" />
          {stage >= 2 && <rect x="130" y="82" width="14" height="12" fill="#9fd3f0" />}
          {stage >= 3 && <rect x="176" y="82" width="14" height="12" fill="#9fd3f0" />}
        </g>
      )}
      {dream.theme === 'travel' && (
        <g>
          <path d="M60 120 L110 60 L160 120 Z" fill="#c8a06a" />
          <path d="M140 120 L200 50 L260 120 Z" fill="#b48a55" />
          {stage >= 2 && <path d="M40 40 l40 6 l-40 6 l8 -6 z" fill="#fff" />}
        </g>
      )}
      {dream.theme === 'study' && (
        <g>
          <rect x="110" y="60" width="100" height="64" fill="#f0f0f5" stroke="#6b6f8a" />
          <path d="M100 62 L160 34 L220 62 Z" fill="#5b6aa8" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={120 + i * 22} y="72" width="8" height="52" fill="#d0d4e6" />
          ))}
          {stage >= 3 && <path d="M150 20 l10 -6 l10 6 l-10 6z" fill="#222" />}
        </g>
      )}
      {dream.theme === 'business' && (
        <g>
          <rect x="110" y="66" width="100" height="58" fill="#fff8ec" stroke="#7a6a52" />
          <path d="M106 66 h108 l-8 -14 h-92z" fill="#2f6f4f" />
          <rect x="124" y="84" width="30" height="40" fill="#cfe8f7" />
          {stage >= 2 && <rect x="166" y="80" width="34" height="10" fill="#e0b84f" />}
        </g>
      )}
      {dream.theme === 'garden' && (
        <g>
          {[60, 110, 160, 210, 260].slice(0, 2 + stage).map((x) => (
            <g key={x}>
              <rect x={x - 2} y="90" width="4" height="30" fill="#6b4a2f" />
              <circle cx={x} cy="84" r="16" fill="#4f9d4a" />
            </g>
          ))}
        </g>
      )}
      {dream.theme === 'family' && (
        <g>
          <rect x="70" y="92" width="180" height="10" rx="5" fill="#8a5d3b" />
          {[100, 140, 180, 220].slice(0, 1 + Math.min(3, stage)).map((x) => (
            <circle key={x} cx={x} cy="80" r="9" fill="#e7b38a" />
          ))}
        </g>
      )}
      {dream.theme === 'city' && (
        <g>
          {[40, 80, 120, 170, 220, 260].map((x, i) => (
            <rect key={x} x={x} y={120 - (30 + ((i * 17) % 50))} width="30" height={30 + ((i * 17) % 50)} fill={i % 2 ? '#7d8aa3' : '#5e6b85'} opacity={i < 2 + stage ? 1 : 0.25} />
          ))}
        </g>
      )}
      {stage >= 4 && <path d="M20 140 Q160 128 300 140" stroke="#fff" strokeWidth="3" strokeDasharray="6 6" fill="none" />}
    </svg>
  );
}
