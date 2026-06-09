import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { setActiveTournament } from './firebase';

function Root() {
  // 'landing' | 'creating' | 'tournament'
  const [screen, setScreen] = useState('landing');
  const [activeContext, setActiveContext] = useState(null); // { clubId, tournamentId }

  function handleSelectTournament(clubId, tournamentId) {
    setActiveTournament(clubId, tournamentId);
    setActiveContext({ clubId, tournamentId });
    setScreen('tournament');
  }

  function handleCreateTournament(clubId) {
    // Sentinel path until handleStart generates the real tournament ID
    setActiveTournament(clubId, '__creating__');
    setActiveContext({ clubId, tournamentId: null });
    setScreen('creating');
  }

  // Called by App after handleStart generates the tournament ID
  function handleCreated(clubId, tournamentId) {
    setActiveTournament(clubId, tournamentId);
    setActiveContext({ clubId, tournamentId });
    setScreen('tournament');
  }

  function handleBack() {
    history.pushState(null, '', location.pathname + location.search);
    setScreen('landing');
    setActiveContext(null);
  }

  // Browser back/forward: sync app screen state with URL hash
  useEffect(() => {
    const onPopState = (e) => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setScreen('landing');
        setActiveContext(null);
      } else if (e.state?.tournamentId) {
        const { clubId, tournamentId } = e.state;
        setActiveTournament(clubId, tournamentId);
        setActiveContext({ clubId, tournamentId });
        setScreen('tournament');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (screen === 'landing') {
    return (
      <LandingPage
        onSelectTournament={handleSelectTournament}
        onCreateTournament={handleCreateTournament}
      />
    );
  }

  // key changes from null→tournamentId after handleCreated, which remounts App
  // so useFirebaseSync re-registers listeners against the correct path.
  return (
    <App
      key={activeContext?.tournamentId ?? 'new'}
      clubId={activeContext?.clubId}
      tournamentId={activeContext?.tournamentId ?? null}
      onCreated={handleCreated}
      onBack={handleBack}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>
);
