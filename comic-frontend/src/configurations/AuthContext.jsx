import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('webcomic_user');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            if (parsedUser && parsedUser.role === 'ADMIN') {
                sessionStorage.setItem('isAdmin', 'true');
            }
        } catch (e) {
            console.error("Error parsing user from local storage");
        }
    }
  }, []);

  const login = (data) => {
    let userData = data;
    if (data && data.token && data.user) {
        userData = data.user;
        localStorage.setItem('webcomic_token', data.token);
    }
    if (userData && userData.role === 'ADMIN') {
        sessionStorage.setItem('isAdmin', 'true');
    }
    setUser(userData);
    localStorage.setItem('webcomic_user', JSON.stringify(userData));
    setShowAuthModal(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('webcomic_user');
    localStorage.removeItem('webcomic_token');
    sessionStorage.removeItem('isAdmin');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, showAuthModal, setShowAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
