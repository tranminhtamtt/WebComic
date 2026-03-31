import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import '../style/global.css';

const Footer = () => {
    return (
        <footer className="footer-container premium-footer" style={{ zIndex: 10, position: 'relative', marginTop: '100px' }}>
            {/* Sao biển, Vỏ sò trang trí */}
            <div style={{ position: 'absolute', top: '-15px', left: 0, width: '100%', height: '30px', pointerEvents: 'none', zIndex: 12, overflow: 'hidden' }}>
                <span style={{ position: 'absolute', left: '12%', fontSize: '1.5rem', transform: 'rotate(-20deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}>🐚</span>
                <span style={{ position: 'absolute', left: '30%', fontSize: '1.8rem', transform: 'rotate(15deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}>⭐</span>
                <span style={{ position: 'absolute', left: '55%', fontSize: '1.4rem', transform: 'rotate(-10deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}>🐚</span>
                <span style={{ position: 'absolute', left: '78%', fontSize: '1.6rem', transform: 'rotate(25deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}>⭐</span>
                <span style={{ position: 'absolute', left: '92%', fontSize: '1.3rem', transform: 'rotate(-30deg)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.3))' }}>🐚</span>
            </div>

            {/* Sóng biển đập vào bờ */}
            <div className="ocean-waves">
                <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                    <defs>
                        <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                    </defs>
                    <g className="parallax">
                        <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(255, 255, 255, 0.7)" />
                        <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(255, 255, 255, 0.5)" />
                        <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(255, 255, 255, 0.3)" />
                        <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(255, 255, 255, 0.15)" />
                    </g>
                </svg>
            </div>

            <div className="container">
                <div className="row g-4 mb-4">
                    {/* Cột 1: Thông tin giới thiệu */}
                    <div className="col-12 col-md-4">
                        <h4 className="fw-bold fs-5 text-accent mb-3">WebComic</h4>
                        <p className="text-secondary small lh-lg mb-3">
                            Nền tảng đọc truyện tranh bản quyền trực tuyến hàng đầu. Cập nhật chap mới chuẩn tốc độ, giao diện mượt mà và tối ưu hóa trải nghiệm người dùng.
                        </p>
                        <div className="d-flex align-items-center gap-3">
                            {/* Icon Facebook */}
                            <a href="#" className="icon-btn text-muted hover-accent text-decoration-none" style={{ transition: 'color 0.2s', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                            </a>
                            {/* Icon Instagram */}
                            <a href="#" className="icon-btn text-muted hover-accent text-decoration-none" style={{ transition: 'color 0.2s', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            </a>
                            {/* Icon Zalo (Custom) */}
                            <a href="#" className="icon-btn text-muted hover-accent text-decoration-none fw-bold" style={{ transition: 'color 0.2s', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px' }}>
                                Zalo
                            </a>
                        </div>
                    </div>

                    {/* Cột 2: Đường dẫn nhanh */}
                    <div className="col-12 col-md-4">
                        <h5 className="fw-bold mb-3 fs-6">Hệ Thống</h5>
                        <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                            <li><a href="/" className="text-secondary small text-decoration-none hover-accent" style={{ transition: 'color 0.2s' }}>› Truyện Mới Cập Nhật</a></li>
                            <li><a href="/the-loai" className="text-secondary small text-decoration-none hover-accent" style={{ transition: 'color 0.2s' }}>› Tìm Theo Thể Loại</a></li>
                            <li><a href="/bookmarks" className="text-secondary small text-decoration-none hover-accent" style={{ transition: 'color 0.2s' }}>› Tủ Truyện Của Bạn</a></li>
                            <li><a href="#" className="text-secondary small text-decoration-none hover-accent" style={{ transition: 'color 0.2s' }}>› Góp Ý Báo Lỗi</a></li>
                        </ul>
                    </div>

                    {/* Cột 3: Liên hệ */}
                    <div className="col-12 col-md-4">
                        <h5 className="fw-bold mb-3 fs-6">Liên Hệ</h5>
                        <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
                            <li className="d-flex align-items-start gap-2">
                                <MapPin size={16} className="text-accent flex-shrink-0 mt-1" />
                                <span className="text-secondary small">123 Trần Duy Hưng, Cầu Giấy, Hà Nội</span>
                            </li>
                            <li className="d-flex align-items-center gap-2">
                                <Phone size={16} className="text-accent flex-shrink-0" />
                                <span className="text-secondary small">0123 456 789</span>
                            </li>
                            <li className="d-flex align-items-center gap-2">
                                <Mail size={16} className="text-accent flex-shrink-0" />
                                <span className="text-secondary small">contact@webcomic.vn</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Dòng bản quyền */}
                <div className="border-top border-secondary border-opacity-25 pt-3 d-flex flex-column flex-md-row justify-content-between align-items-center">
                    <p className="text-muted small mb-0">
                        &copy; {new Date().getFullYear()} WebComic. All rights reserved.
                    </p>
                    <div className="d-flex gap-3 mt-2 mt-md-0">
                        <a href="#" className="text-muted small text-decoration-none hover-accent">Điều khoản dịch vụ</a>
                        <a href="#" className="text-muted small text-decoration-none hover-accent">Chính sách bảo mật</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
