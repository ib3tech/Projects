import { Character } from '../engine/profile';
import { levelOf, totalXp } from '../engine/gamification';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { Choice, cx } from './kit';

const SKINS = ['#fcd7b0', '#e8a978', '#c98a4b', '#8c5a2b', '#4a2c14'];
const HAIR = ['#1f1f1f', '#8a4718', '#d4a017', '#e8743b', '#94a3b8'];
const OUTFITS = ['#2b47b9', '#16936b', '#d93030', '#7c3aed', '#374151', '#0e8fb0'];
const ACCENTS = ['#d9ce9f', '#e6e1d8', '#c06060', '#74a18a', '#8a7fd0', '#294337'];

function Swatches({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
        {options.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} onClick={() => onChange(c)} style={{ background: c }}
            className={cx('h-9 w-9 rounded-full ring-offset-2 transition', value === c ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-faint')} />
        ))}
      </div>
    </div>
  );
}

export function CharacterEditor() {
  const { state, update } = useStore();
  const c = state.character;
  const set = (patch: Partial<Character>) => update((d) => void (d.character = { ...d.character, ...patch }));
  const lvl = levelOf(totalXp(state)).level;
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="overflow-hidden rounded-2xl ring-1 ring-line"><Avatar c={c} level={lvl} size={196} /></div>
      <Choice ariaLabel="Pronouns" value={c.gender} onChange={(v) => set({ gender: v, hairStyle: v === 'male' && c.hairStyle === 'long' ? 'short' : c.hairStyle })}
        options={[{ v: 'female', label: 'She / Her' }, { v: 'male', label: 'He / Him' }, { v: 'neutral', label: 'They / Them' }]} className="justify-center" />
      <div className="flex w-full max-w-[340px] flex-col gap-5">
        <Swatches label="Skin tone" value={c.skin} options={SKINS} onChange={(v) => set({ skin: v })} />
        <Swatches label="Hair colour" value={c.hair} options={HAIR} onChange={(v) => set({ hair: v })} />
        <div>
          <div className="eyebrow mb-2">Hair style</div>
          <Choice ariaLabel="Hair style" value={c.hairStyle} onChange={(v) => set({ hairStyle: v })}
            options={[{ v: 'long', label: 'Long' }, { v: 'bob', label: 'Bob' }, { v: 'bun', label: 'Bun' }, { v: 'short', label: 'Short' }, { v: 'curly', label: 'Curly' }]} />
        </div>
        <div>
          <div className="eyebrow mb-2">Head covering</div>
          <Choice ariaLabel="Head covering" value={c.headwear} onChange={(v) => set({ headwear: v })}
            options={[{ v: 'none', label: 'None' }, { v: 'scarf', label: 'Headscarf' }, { v: 'kufi', label: 'Kufi' }, { v: 'cap', label: 'Cap' }]} />
        </div>
        <Swatches label="Outfit" value={c.outfit} options={OUTFITS} onChange={(v) => set({ outfit: v })} />
        <Swatches label="Accent / headwear" value={c.accent} options={ACCENTS} onChange={(v) => set({ accent: v })} />
        <div>
          <div className="eyebrow mb-2">Accessories</div>
          <button type="button" aria-pressed={c.glasses} className={cx('chip', c.glasses && 'chip-on')} onClick={() => set({ glasses: !c.glasses })}>Glasses</button>
        </div>
      </div>
    </div>
  );
}
