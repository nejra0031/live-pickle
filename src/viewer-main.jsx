import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import LandingPage from './LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { setActiveTournament } from './firebase';

function ViewerRoot() {
  const [screen, setScreen] = useState('landing');
  const [activeContext, setActiveContext] = useState(null);

  function handleSelectTournament(clubId, tournamentId) {
    setActiveTournament(clubId, tournamentId);
    setActiveContext({ clubId, tournamentId });
    setScreen('tournament');
  }

  function handleBack() {
    setScreen('landing');
    setActiveContext(null);
  }

  if (screen === 'landing') {
    return (
      <LandingPage
        viewerOnly={true}
        onSelectTournament={handleSelectTournament}
        onCreateTournament={() => {}}
      />
    );
  }

  return (
    <App
      key={activeContext?.tournamentId}
      viewerOnly={true}
      clubId={activeContext?.clubId}
      onBack={handleBack}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ViewerRoot />
  </ErrorBoundary>
);
