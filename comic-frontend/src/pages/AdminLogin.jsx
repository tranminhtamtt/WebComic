import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, Lock, ExternalLink } from 'lucide-react';
import { useAuth } from '../configurations/AuthContext';
import '../style/global.css'; // Make sure this is imported if not globally

const AdminLogin = () => {
    const { user } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // If already recognized as admin in session or auth context, redirect
        if (sessionStorage.getItem('isAdmin') === 'true' || (user && user.role === 'ADMIN')) {
            if (user && user.role === 'ADMIN') {
                sessionStorage.setItem('isAdmin', 'true');
            }
            navigate('/admin/dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, passwordHash: password })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.role === 'ADMIN') {
                    if (data.token) localStorage.setItem('webcomic_token', data.token);
                    sessionStorage.setItem('isAdmin', 'true');
                    navigate('/admin/dashboard');
                } else {
                    setError('Tài khoản của bạn không có quyền Quản trị!');
                }
            } else {
                setError('Sai tài khoản hoặc mật khẩu!');
            }
        } catch (err) {
            setError('Lỗi kết nối tới Server!');
        }
    };

    return (
        <div className="admin-login-container custom-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="admin-login-box glassmorphism-card text-white" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <div className="text-center mb-4">
                    <ShieldAlert size={48} className="text-danger mx-auto mb-3" />
                    <h2 className="mb-1" style={{ fontWeight: 800 }}>ADMIN PORTAL</h2>
                    <p className="text-muted">Đăng nhập để vào hệ thống quản trị cào dữ liệu</p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label text-muted small text-uppercase">Tài khoản</label>
                        <div className="input-group">
                            <span className="input-group-text bg-dark border-secondary text-muted">
                                <User size={18} />
                            </span>
                            <input
                                type="text"
                                className="form-control bg-dark border-secondary text-white"
                                placeholder="Nhập username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label text-muted small text-uppercase">Mật khẩu</label>
                        <div className="input-group">
                            <span className="input-group-text bg-dark border-secondary text-muted">
                                <Lock size={18} />
                            </span>
                            <input
                                type="password"
                                className="form-control bg-dark border-secondary text-white"
                                placeholder="Nhập password..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-danger w-100 py-2 d-flex align-items-center justify-content-center gap-2">
                        ĐĂNG NHẬP <ExternalLink size={18} />
                    </button>

                    <div className="mt-4 text-center">
                        <a href="/" className="text-muted text-decoration-none small hover-primary" style={{ transition: 'color 0.2s' }}>
                            ← Quay lại trang chủ
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
