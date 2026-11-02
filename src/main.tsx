import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { claimTournamentOwnership, isTournamentOwner, writeTournamentMeta } from './firebase';

function Root() {
  // 'landing' | 'creating' | 'tournament'
  const [screen, setScreen] = useState('landing');
  const [activeContext, setActiveContext] = useState<{
    tournamentId: string | null;
    initialRole?: string;
  } | null>(null);
  // Whether the signed-in user owns the active tournament (they created it).
  const [isOwner, setIsOwner] = useState(false);

  const { user, signIn, signOut } = useAuth();
  const uid: string | null = user?.uid ?? null;
  const activeTid = activeContext?.tournamentId ?? null;

  // Resolve ownership whenever the open tournament or the signed-in user changes.
  // A freshly created tournament is marked owned immediately in handleCreated.
  useEffect(() => {
    if (!activeTid || !uid) {
      if (screen !== 'creating') setIsOwner(false);
      return;
    }
    let cancelled = false;
    isTournamentOwner(activeTid, uid).then((owned) => {
      if (!cancelled) setIsOwner((prev) => prev || owned);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTid, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectTournament(tournamentId: string) {
    setIsOwner(false);
    setActiveContext({ tournamentId });
    setScreen('tournament');
  }

  // Anyone signed in with Google can create a tournament; they become its owner.
  async function handleCreateTournament() {
    if (!user) {
      try {
        await signIn();
      } catch {
        return; // popup closed / sign-in failed
      }
    }
    // tournamentId=null until handleStart generates the real tournament ID
    setIsOwner(true);
    setActiveContext({ tournamentId: null });
    setScreen('creating');
  }

  // Called by App after handleStart generates the tournament ID
  function handleCreated(tournamentId: string, role: string) {
    if (uid) {
      claimTournamentOwnership(tournamentId, uid);
      writeTournamentMeta(tournamentId, { ownerUid: uid });
    }
    setIsOwner(!!uid);
    setActiveContext({ tournamentId, initialRole: role });
    setScreen('tournament');
  }

  function handleBack() {
    history.pushState(null, '', location.pathname + location.search);
    setScreen('landing');
    setActiveContext(null);
    setIsOwner(false);
  }

  // Browser back/forward: sync app screen state with URL hash
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setScreen('landing');
        setActiveContext(null);
        setIsOwner(false);
      } else if (e.state?.tournamentId) {
        setIsOwner(false);
        setActiveContext({ tournamentId: e.state.tournamentId });
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
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />
    );
  }

  // key changes from null→tournamentId after handleCreated, which remounts App
  // so useFirebaseSync re-registers listeners against the correct path.
  return (
    <App
      key={activeTid ?? 'new'}
      tournamentId={activeTid}
      initialRole={activeContext?.initialRole ?? null}
      isOwner={isOwner && !!uid}
      user={user}
      onSignIn={signIn}
      onSignOut={signOut}
      onCreated={handleCreated}
      onBack={handleBack}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>
);
