import { useState, useEffect } from 'react';
import { subscribeAuth, signInWithGoogle, signOutUser } from '../firebase';

// Wraps Firebase Auth's onAuthStateChanged — { user, loading, signIn, signOut }.
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, signIn: signInWithGoogle, signOut: signOutUser };
}
