import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ConnectionBadge from './components/ConnectionBadge';
import Dashboard from './screens/Dashboard';
import Alarms from './screens/Alarms';
import Runtime from './screens/Runtime';
import Settings from './screens/Settings';
import Support from './screens/Support';

export type Screen = 'dashboard' | 'alarms' | 'runtime' | 'settings' | 'support';

const TITLES: Record<Screen, string> = {
  dashboard: 'Dashboard',
  alarms: 'Alarms',
  runtime: 'Runtime',
  settings: 'Settings',
  support: 'Support',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');

  return (
    <div className="layout">
      <Sidebar active={screen} onNavigate={setScreen} />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{TITLES[screen]}</span>
          <ConnectionBadge />
        </div>
        <div className="page">
          {screen === 'dashboard' && <Dashboard />}
          {screen === 'alarms'    && <Alarms />}
          {screen === 'runtime'   && <Runtime />}
          {screen === 'settings'  && <Settings />}
          {screen === 'support'   && <Support />}
        </div>
      </div>
    </div>
  );
}
