import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: 'usr_8041',
  name: 'Agent Sarah Connor',
  email: 's.connor@cryptotrace.ai',
  role: 'Senior Forensics Investigator',
  badge: 'CT-8041',
  agency: 'Cyber Forensics Unit (CFU)',
  avatar: 'SC',
};

const ANALYST_PROFILES = [
  {
    id: 'usr_8041',
    name: 'Agent Sarah Connor',
    email: 's.connor@cryptotrace.ai',
    role: 'Senior Forensics Investigator',
    badge: 'CT-8041',
    agency: 'Cyber Forensics Unit (CFU)',
    avatar: 'SC',
  },
  {
    id: 'usr_3920',
    name: 'Marcus Vance',
    email: 'm.vance@cryptotrace.ai',
    role: 'BSA / AML Compliance Officer',
    badge: 'AML-3920',
    agency: 'Financial Crimes Enforcement (FinCEN)',
    avatar: 'MV',
  },
  {
    id: 'usr_1104',
    name: 'Elena Rostova',
    email: 'e.rostova@cryptotrace.ai',
    role: 'Threat Intelligence Lead',
    badge: 'OFAC-1104',
    agency: 'Sanctions & Cyber Defense Group',
    avatar: 'ER',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cryptotrace_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_USER;
      }
    }
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('cryptotrace_auth') !== 'false';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('cryptotrace_user', JSON.stringify(user));
    }
    localStorage.setItem('cryptotrace_auth', isAuthenticated ? 'true' : 'false');
  }, [user, isAuthenticated]);

  const login = (userData) => {
    setUser(userData || DEFAULT_USER);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const switchProfile = (profileId) => {
    const found = ANALYST_PROFILES.find((p) => p.id === profileId);
    if (found) {
      setUser(found);
      setIsAuthenticated(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        switchProfile,
        availableProfiles: ANALYST_PROFILES,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
