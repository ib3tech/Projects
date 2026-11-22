import { useEffect, useState } from 'react';
import { emptyState } from '../engine/defaults';
import { useStore } from '../state/store';
import { CareerView } from './views/CareerView';
import { CompareView } from './views/CompareView';
import { Dashboard } from './views/Dashboard';
import { MathView } from './views/MathView';
import { MeterView } from './views/MeterView';
import { Questionnaire, SignUp } from './views/Onboarding';
import { PotsView } from './views/PotsView';
import { RouteView } from './views/RouteView';
import { SelfTaxView } from './views/SelfTaxView';
import { SettingsView } from './views/SettingsView';
import { YouView } from './views/YouView';

const TABS = [
  { id: 'home', label: 'Home', icon: '⌂', main: true },
  { id: 'route', label: 'Route', icon: '↗', main: true },
  { id: 'meter', label: 'Delusion Meter', icon: '◐', main: true },
  { id: 'selftax', label: 'Self-tax', icon: '％', main: true },
  { id: 'pots', label: 'Pots', icon: '◫' },
  { id: 'career', label: 'Career', icon: '⚑' },
  { id: 'compare', label: 'Compare', icon: '≋' },
  { id: 'math', label: 'Open the math', icon: '∑' },
  { id: 'you', label: 'You & quests', icon: '☺', main: true },
  { id: 'assumptions', label: 'Settings', icon: '⚙' },
];

export function App() {
  const { state, replace } = useStore();
  const [tab, setTab] = useState(() => location.hash.slice(1) || 'home');
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const on = () => setTab(location.hash.slice(1) || 'home');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const go = (t: string) => {
    location.hash = t;
    setTab(t);
    setMore(false);
    window.scrollTo({ top: 0 });
  };

  const banner = (
    <div className="sim-banner" role="note">
      Prototype · all accounts, balances, achievements and transfers are <b>simulated</b> · no bank connection
      {state.isDemo && (
        <>
          {' · '}
          <b>Fictional demo persona</b> — not real data{' '}
          <button className="link" onClick={() => replace(emptyState())}>
            Start my own
          </button>
        </>
      )}
    </div>
  );

  if (!state.account) return <>{banner}<SignUp /></>;
  if (!state.onboarded || editing)
    return (
      <>
        {banner}
        {editing && (
          <div className="center pad">
            <button className="btn ghost small" onClick={() => setEditing(false)}>← Back to the app</button>
          </div>
        )}
        <Questionnaire onDone={() => setEditing(false)} />
      </>
    );

  const view = (() => {
    switch (tab) {
      case 'route': return <RouteView go={go} />;
      case 'meter': return <MeterView />;
      case 'selftax': return <SelfTaxView />;
      case 'pots': return <PotsView />;
      case 'career': return <CareerView />;
      case 'compare': return <CompareView />;
      case 'math': return <MathView />;
      case 'you': return <YouView />;
      case 'assumptions': return <SettingsView editProfile={() => setEditing(true)} />;
      default: return <Dashboard go={go} />;
    }
  })();
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="app">
      {banner}
      <div className="layout">
        <nav className="side-nav" aria-label="Main">
          <div className="brand"><span className="logo-mark sm" aria-hidden>FS</span> Future Self</div>
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => go(t.id)}>
              <span className="ico" aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <main>
          <header className="page-head">
            <h2>{current.id === 'home' ? `Hello${state.profile.name ? ', ' + state.profile.name : ''}` : current.label}</h2>
          </header>
          {view}
          <footer className="foot small muted">Future Self prototype · forecasts are illustrations built on your assumptions, not advice or guarantees.</footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Main (mobile)">
        {TABS.filter((t) => t.main).map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => go(t.id)} aria-current={t.id === tab ? 'page' : undefined}>
            <span className="ico" aria-hidden>{t.icon}</span>
            <span>{t.id === 'meter' ? 'Meter' : t.id === 'you' ? 'You' : t.label}</span>
          </button>
        ))}
        <button className={more || !current.main ? 'on' : ''} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <span className="ico" aria-hidden>⋯</span>
          <span>More</span>
        </button>
      </nav>
      {more && (
        <div className="more-sheet" role="dialog" aria-label="More sections">
          {TABS.filter((t) => !t.main).map((t) => (
            <button key={t.id} onClick={() => go(t.id)}>
              <span className="ico" aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
