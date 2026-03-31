import React, { useState } from 'react';
import { useAuth } from '../configurations/AuthContext';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useTheme } from '../configurations/ThemeContext';

const AuthModal = () => {
    const { showAuthModal, setShowAuthModal, login } = useAuth();
    const { contentMode } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', username: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!showAuthModal) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!isLogin && formData.password !== formData.confirmPassword) {
            setError("Mật khẩu nhập lại không khớp!");
            return;
        }

        setLoading(true);

        const url = isLogin ? import.meta.env.VITE_API_BASE_URL + '/auth/login' : import.meta.env.VITE_API_BASE_URL + '/auth/register';
        const payload = isLogin 
            ? { username: formData.username, passwordHash: formData.password }
            : { email: formData.email, username: formData.username, passwordHash: formData.password };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                data = await res.text();
            }

            if (res.ok) {
                if (typeof data === 'string') {
                    // unexpected, but handle it
                    login({ username: formData.username });
                } else {
                    login(data);
                }
            } else {
                setError(data.message || (typeof data === 'string' ? data : "Đã có lỗi xảy ra!"));
            }
        } catch (err) {
            setError("Lỗi kết nối Server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop-custom d-flex justify-content-center align-items-center animate-fade-in" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.85)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="admin-glass-card rounded-4 p-0 shadow-lg overflow-hidden animate-slide-up" style={{ width: '400px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <div className="p-3 border-bottom border-secondary border-opacity-50 d-flex justify-content-between align-items-center" style={{ background: 'var(--bg-secondary)' }}>
                    <h5 className="m-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                        {isLogin ? 'Đăng Nhập Thành Viên' : 'Tạo Tài Khoản Mới'}
                    </h5>
                    <button className="btn text-secondary hover-text-light p-0" onClick={() => setShowAuthModal(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4" style={{ background: 'var(--bg-primary)' }}>
                    {/* Tabs */}
                    <div className="d-flex mb-4 border-bottom border-secondary border-opacity-25 position-relative">
                        <button 
                            className={`flex-grow-1 pb-2 bg-transparent border-0 fw-bold ${isLogin ? 'text-primary border-primary' : 'text-secondary'}`} 
                            style={{ borderBottom: isLogin ? '2px solid' : '2px solid transparent', color: isLogin ? 'var(--accent)' : 'inherit' }}
                            onClick={() => { setIsLogin(true); setError(null); }}
                        >
                            Đăng Nhập
                        </button>
                        <button 
                            className={`flex-grow-1 pb-2 bg-transparent border-0 fw-bold ${!isLogin ? 'text-primary border-primary' : 'text-secondary'}`} 
                            style={{ borderBottom: !isLogin ? '2px solid' : '2px solid transparent', color: !isLogin ? 'var(--accent)' : 'inherit' }}
                            onClick={() => { setIsLogin(false); setError(null); }}
                        >
                            Đăng Ký
                        </button>
                    </div>

                    {error && <div className="alert alert-danger py-2 fs-6 small mb-3">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        {isLogin ? (
                            <div className="mb-3 position-relative">
                                <UserIcon size={16} className="position-absolute text-secondary" style={{ top: '10px', left: '12px' }}/>
                                <input 
                                    type="text" required
                                    className="form-control border-secondary ps-5" 
                                    style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                    placeholder="Tài khoản đăng nhập"
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 position-relative">
                                    <UserIcon size={16} className="position-absolute text-secondary" style={{ top: '10px', left: '12px' }}/>
                                    <input 
                                        type="text" required
                                        className="form-control border-secondary ps-5" 
                                        style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                        placeholder="Tên hiển thị (Username)"
                                        value={formData.username}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                                <div className="mb-3 position-relative">
                                    <Mail size={16} className="position-absolute text-secondary" style={{ top: '10px', left: '12px' }}/>
                                    <input 
                                        type="email" required
                                        className="form-control border-secondary ps-5" 
                                        style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                        placeholder="Địa chỉ Email"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </>
                        )}
                        <div className="mb-3 position-relative">
                            <Lock size={16} className="position-absolute text-secondary" style={{ top: '10px', left: '12px' }}/>
                            <input 
                                type="password" required
                                className="form-control border-secondary ps-5" 
                                style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                placeholder="Mật khẩu"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                        {!isLogin && (
                            <div className="mb-4 position-relative">
                                <Lock size={16} className="position-absolute text-secondary" style={{ top: '10px', left: '12px' }}/>
                                <input 
                                    type="password" required
                                    className="form-control border-secondary ps-5" 
                                    style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                    placeholder="Nhập lại Mật khẩu"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className={`btn w-100 fw-bold ${contentMode === 'DEMON' ? 'btn-danger' : 'btn-primary'} ${isLogin ? 'mb-4' : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Đang xử lý...' : (isLogin ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default AuthModal;
