import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useMyClubs } from './hooks/useMyClubs';

function Root() {
  // 'landing' | 'creating' | 'tournament'
  const [screen, setScreen] = useState('landing');
  const [activeContext, setActiveContext] = useState<{
    clubId: string;
    tournamentId: string | null;
    initialRole?: string;
  } | null>(null);

  const { user, signIn, signOut } = useAuth();
  const { ownedClubIds, createClub } = useMyClubs(user?.uid ?? null);

  function handleSelectTournament(clubId: string, tournamentId: string) {
    setActiveContext({ clubId, tournamentId });
    setScreen('tournament');
  }

  function handleCreateTournament(clubId: string) {
    if (!ownedClubIds.includes(clubId)) return;
    // tournamentId=null until handleStart generates the real tournament ID
    setActiveContext({ clubId, tournamentId: null });
    setScreen('creating');
  }

  // Called by App after handleStart generates the tournament ID
  function handleCreated(clubId: string, tournamentId: string, role: string) {
    setActiveContext({ clubId, tournamentId, initialRole: role });
    setScreen('tournament');
  }

  function handleBack() {
    history.pushState(null, '', location.pathname + location.search);
    setScreen('landing');
    setActiveContext(null);
  }

  // Browser back/forward: sync app screen state with URL hash
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setScreen('landing');
        setActiveContext(null);
      } else if (e.state?.tournamentId) {
        const { clubId, tournamentId } = e.state;
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
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
        ownedClubIds={ownedClubIds}
        onCreateClub={createClub}
      />
    );
  }

  const isOwner = activeContext ? ownedClubIds.includes(activeContext.clubId) : false;

  // key changes from null→tournamentId after handleCreated, which remounts App
  // so useFirebaseSync re-registers listeners against the correct path.
  return (
    <App
      key={activeContext?.tournamentId ?? 'new'}
      clubId={activeContext?.clubId}
      tournamentId={activeContext?.tournamentId ?? null}
      initialRole={activeContext?.initialRole ?? null}
      isOwner={isOwner}
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
