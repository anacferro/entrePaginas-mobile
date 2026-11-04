import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { storage } from '../services/storage';

const AuthContext = createContext({ user: null, initializing: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return authService.onChange(async (firebaseUser) => {
      if (firebaseUser) {
        storage.setUser(firebaseUser.uid);
        await storage.init(firebaseUser);
        await storage.syncFromCloud();
      } else {
        storage.setUser(null);
      }
      setUser(firebaseUser);
      setInitializing(false);
    });
  }, []);

  return <AuthContext.Provider value={{ user, initializing }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
