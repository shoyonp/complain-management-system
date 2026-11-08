import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/axios.js';
import { auth } from '../lib/firebase.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetches the MongoDB profile. A 403 (PROFILE_REQUIRED) simply means the
  // student has not completed onboarding yet — not an error.
  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data.data);
      return data.data;
    } catch (error) {
      if (error?.response?.status === 403) {
        setProfile(null);
        return null;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await refreshProfile();
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ firebaseUser, profile, loading, refreshProfile, signOut }),
    [firebaseUser, profile, loading, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
