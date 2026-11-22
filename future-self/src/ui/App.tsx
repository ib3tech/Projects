import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Landing, Onboarding } from './Onboarding';
import { NAV, NavId, PageHead, Shell } from './Shell';
import { Career } from './views/Career';
import { Compare } from './views/Compare';
import { MathView } from './views/Math';
import { Meter } from './views/Meter';
import { Overview } from './views/Overview';
import { Pots } from './views/Pots';
import { Route } from './views/Route';
import { Settings } from './views/Settings';
import { Spending } from './views/Spending';
import { You } from './views/You';

const fromHash = (): NavId => {
  const h = location.hash.slice(1);
  return (NAV.some((n) => n.id === h) ? h : 'overview') as NavId;
};

export function App() {
  const { state, replace } = useStore();
  const [tab, setTab] = useState<NavId>(fromHash);
  const [mode, setMode] = useState<'landing' | 'onboarding' | 'app'>(state.onboarded ? 'app' : 'landing');
  useEffect(() => {
    const on = () => setTab(fromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (state.onboarded && mode === 'landing') setMode('app');
    if (!state.onboarded && mode === 'app') setMode('landing');
  }, [state.onboarded, mode]);
  const go = (t: NavId) => {
    location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  const edit = () => { setMode('onboarding'); window.scrollTo({ top: 0 }); };

  const demoBar = state.isDemo && mode === 'app' && (
    <div className="bg-forest px-4 py-1.5 text-center text-xs text-white/90">
      Fictional example — not real data.{' '}
      <button className="font-semibold text-sun underline" onClick={() => { replace({ ...state, isDemo: false, onboarded: false, account: null }); setMode('landing'); }}>Start my own plan</button>
    </div>
  );

  if (mode === 'landing') return <Landing onStart={() => setMode('onboarding')} />;
  if (mode === 'onboarding') return <Onboarding onExit={() => setMode(state.onboarded ? 'app' : 'landing')} />;

  const view = (() => {
    switch (tab) {
      case 'route': return <Route go={go} />;
      case 'spending': return <Spending />;
      case 'meter': return <Meter />;
      case 'pots': return <Pots />;
      case 'career': return <Career />;
      case 'compare': return <Compare />;
      case 'math': return <MathView />;
      case 'you': return <You />;
      case 'assumptions': return <Settings onEdit={edit} />;
      default: return <Overview go={go} />;
    }
  })();
  return (
    <>
      {demoBar}
      <Shell tab={tab} go={go} onEdit={edit}>
        <PageHead tab={tab} onEdit={edit} />
        {view}
      </Shell>
    </>
  );
}
