import React from 'react';
import { useTheme, themeColors } from '../configurations/ThemeContext';

const AuraWidget = () => {
    const { themeColor, setThemeColor, isAuraAuto, setIsAuraAuto, theme, contentMode } = useTheme();

    if (theme === 'LIGHT') return null;

    return (
        <div 
            className="d-none d-lg-flex flex-column align-items-center justify-content-center gap-2 py-3 px-2 rounded-end shadow-lg" 
            style={{
                position: 'fixed',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.6)', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderLeft: 'none',
                zIndex: 9999,
                cursor: 'default'
            }}
        >
            <span 
                className="text-light fw-bold" 
                style={{
                    writingMode: 'vertical-rl', 
                    transform: 'rotate(180deg)', 
                    fontSize: '0.65rem', 
                    letterSpacing: '2px', 
                    opacity: 0.8
                }}
            >
                AURA
            </span>
            {themeColors.map((theme, idx) => {
                const isActive = !isAuraAuto && themeColor === idx;
                return (
                    <div 
                        key={idx} 
                        onClick={() => {
                            setIsAuraAuto(false);
                            setThemeColor(idx);
                        }}
                        style={{
                            width: '18px', height: '18px', borderRadius: '50%', 
                            background: theme.color, cursor: 'pointer',
                            border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                            boxShadow: isActive ? `0 0 15px ${theme.color}, 0 0 30px ${theme.color}` : 'none',
                            transition: 'all 0.3s ease',
                            transform: isActive ? 'scale(1.3)' : 'scale(1)'
                        }}
                        title={theme.name}
                    />
                );
            })}
            
            <div style={{width: '60%', height: '1px', background: 'rgba(255,255,255,0.2)', margin: '0.25rem 0'}}></div>
            
            {/* Rainbow Auto Button */}
            <div 
                onClick={() => setIsAuraAuto(true)}
                style={{
                    width: '18px', height: '18px', borderRadius: '50%', 
                    background: 'linear-gradient(45deg, #ef4444, #f59e0b, #10b981, #06b6d4, #a855f7)', 
                    cursor: 'pointer',
                    border: isAuraAuto ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                    boxShadow: isAuraAuto ? '0 0 15px rgba(255,255,255,0.5), 0 0 30px rgba(168,85,247,0.5)' : 'none',
                    transition: 'all 0.3s ease',
                    transform: isAuraAuto ? 'scale(1.3)' : 'scale(1)',
                    animation: isAuraAuto ? 'spin 10s linear infinite' : 'none'
                }}
                title="Cầu Vồng Aura (Tự Động Đổi Chiêu)"
            />
        </div>
    );
};

export default AuraWidget;
