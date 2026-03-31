import React, { createContext, useContext, useState, useEffect } from 'react';
import imgGojoCyan from '../assets/aura/gojo_cyan.png';
import imgNaruto from '../assets/aura/naruto.png';
import imgRaiden from '../assets/aura/raiden.png';
import imgGojoDark from '../assets/aura/gojo_dark.png';
import imgWukong from '../assets/aura/wukong.png';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const themeColors = [
    { name: 'Gojo Satoru (Blue/Cyan)', color: '#06b6d4', lightColor: '#0891b2', darkBg: '#091524', darkSecBg: '#0d1b2e', lightBg: '#e0f2fe', lightSecBg: '#f0f9ff', bgGradient: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(8, 51, 68, 0.8), transparent)', charImg: imgGojoCyan },
    { name: 'Naruto (Orange/Fire)', color: '#f97316', lightColor: '#c2410c', darkBg: '#1f130e', darkSecBg: '#2a1a14', lightBg: '#ffedd5', lightSecBg: '#fff7ed', bgGradient: 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(67, 20, 7, 0.8), transparent)', charImg: imgNaruto },
    { name: 'Raiden Shogun (Purple)', color: '#a855f7', lightColor: '#7e22ce', darkBg: '#130a1c', darkSecBg: '#1d102b', lightBg: '#f3e8ff', lightSecBg: '#faf5ff', bgGradient: 'radial-gradient(ellipse at top, rgba(168, 85, 247, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(59, 7, 100, 0.8), transparent)', charImg: imgRaiden },
    { name: 'Gojo Dark (Deep Blue)', color: '#3b82f6', lightColor: '#1d4ed8', darkBg: '#0b1120', darkSecBg: '#111827', lightBg: '#dbeafe', lightSecBg: '#eff6ff', bgGradient: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(15, 23, 42, 0.9), transparent)', charImg: imgGojoDark },
    { name: 'Wukong (Dark Mystical)', color: '#64748b', lightColor: '#334155', darkBg: '#0d1117', darkSecBg: '#161b22', lightBg: '#f1f5f9', lightSecBg: '#f8fafc', bgGradient: 'radial-gradient(ellipse at top, rgba(100, 116, 139, 0.15), transparent 70%), radial-gradient(ellipse at bottom, rgba(15, 23, 42, 0.9), transparent)', charImg: imgWukong }
];

export const ThemeProvider = ({ children }) => {
  // Theme: LIGHT or DARK
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'LIGHT';
  });

  // Content Mode: FAMILY or DEMON
  const [contentMode, setContentMode] = useState(() => {
    return localStorage.getItem('contentMode') || 'FAMILY';
  });

  // Aura Color Index
  const [themeColor, setThemeColor] = useState(() => {
    return parseInt(localStorage.getItem('auraThemeColor') || '0', 10);
  });

  // Rainbow Aura (Auto mode)
  const [isAuraAuto, setIsAuraAuto] = useState(() => {
    return localStorage.getItem('auraAutoMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('auraAutoMode', isAuraAuto);
    let interval = null;
    if (isAuraAuto) {
        interval = setInterval(() => {
            setThemeColor(prev => (prev + 1) % themeColors.length);
        }, 5000); // 5 seconds interval
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isAuraAuto]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme.toLowerCase());
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('contentMode', contentMode);
    document.documentElement.setAttribute('data-content-mode', contentMode);
  }, [contentMode]);

  useEffect(() => {
    localStorage.setItem('auraThemeColor', themeColor);
    const activeAura = themeColors[themeColor];
    
    // Áp dụng màu nền hài hoà nếu là Dảrk
    if (theme === 'DARK') {
         document.documentElement.style.setProperty('--accent', activeAura.color);
         document.documentElement.style.setProperty('--accent-hover', activeAura.color + 'dd');
         document.documentElement.style.setProperty('--bg-primary', activeAura.darkBg);
         document.documentElement.style.setProperty('--bg-secondary', activeAura.darkSecBg);
         document.documentElement.style.setProperty('--bg-gradient', activeAura.bgGradient);
    } else {
         document.documentElement.style.setProperty('--accent', '#3b82f6');
         document.documentElement.style.setProperty('--accent-hover', '#2563eb');
         document.documentElement.style.setProperty('--bg-primary', '#ffffff');
         document.documentElement.style.setProperty('--bg-secondary', '#ffffff');
         document.documentElement.style.setProperty('--bg-gradient', `none`);
    }
  }, [themeColor, theme, contentMode]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'LIGHT' ? 'DARK' : 'LIGHT'));
  };

  const toggleContentMode = () => {
    setContentMode(prev => (prev === 'FAMILY' ? 'DEMON' : 'FAMILY'));
  };

  return (
    <ThemeContext.Provider value={{ 
        theme, toggleTheme, 
        contentMode, toggleContentMode, setContentMode,
        themeColor, setThemeColor,
        isAuraAuto, setIsAuraAuto 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
