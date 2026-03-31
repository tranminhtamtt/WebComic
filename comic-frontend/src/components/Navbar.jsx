import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Moon, Sun, Shield, ShieldAlert, Search, User, Bookmark, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../configurations/ThemeContext';
import { useAuth } from '../configurations/AuthContext';
import { cachedFetch } from '../services/CacheService';

const Navbar = () => {
  const { theme, toggleTheme, contentMode, toggleContentMode } = useTheme();
  const { user, setShowAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  const isDemon = contentMode === 'DEMON';

  const [categories, setCategories] = React.useState([]);
  const [showCatMenu, setShowCatMenu] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);
  const [clickCount, setClickCount] = React.useState(0);
  const searchContainerRef = React.useRef(null);
  
  // Trạng thái thu gọn Navbar khi cuộn
  const [isVisible, setIsVisible] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [isNavOpen, setIsNavOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        setIsVisible(false); // Lăn xuống -> Ẩn
      } else {
        setIsVisible(true); // Lăn lên -> Hiện
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      setShowSearchDropdown(false);
      navigate('/the-loai?keyword=' + encodeURIComponent(searchQuery.trim()));
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      setShowSearchDropdown(true);
      const timer = setTimeout(() => {
        cachedFetch(`${import.meta.env.VITE_API_BASE_URL}/comics/page?keyword=${encodeURIComponent(searchQuery)}&size=7&page=0`)
          .then(res => res.json())
          .then(data => {
            if (data.content) {
              setSearchResults(data.content);
            }
          })
          .catch(console.error)
          .finally(() => setIsSearching(false));
      }, 400); // 400ms debounce
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    cachedFetch(import.meta.env.VITE_API_BASE_URL + '/categories')
      .then(r => r.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const handleToggleContentMode = () => {
    if (!isDemon) {
      // trying to activate demon mode (needs double click)
      if (clickCount === 0) {
        setClickCount(1);
        // reset count after 1000ms if no second click
        setTimeout(() => setClickCount(0), 1000);
        return;
      }
      // second click
      toggleContentMode();
      setClickCount(0);
      navigate('/');
    } else {
      // turning back to family mode is instant
      toggleContentMode();
      navigate('/');
    }
  };

  return (
    <nav className="navbar" style={{ 
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out',
        position: 'sticky',
        top: 0,
        zIndex: 1050
    }}>
      <div className="nav-brand-group">
        <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="WebComic Logo" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
          <span>WebComic</span>
        </div>

        <button
          className={`toggle-btn ${isDemon ? 'demon-active' : ''}`}
          onClick={handleToggleContentMode}
          title={isDemon ? "Trở về chế độ an toàn" : "Chế độ an toàn"}
        >
          {isDemon ? <ShieldAlert size={16} /> : <Shield size={16} />}
          {isDemon ? 'Demon Mode' : 'Family Mode'}
        </button>
      </div>

      <button className="mobile-toggle-btn bg-transparent border-0 ms-auto align-items-center justify-content-center hover-scale" 
              onClick={() => setIsNavOpen(!isNavOpen)} style={{color: 'var(--text-primary)'}}>
          <Menu size={28} />
      </button>

      <div className={`nav-menu-wrapper ${isNavOpen ? 'open' : ''}`}>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Trang chủ</NavLink>

          <div
            className="nav-item position-relative"
            onMouseEnter={() => !isNavOpen && setShowCatMenu(true)}
            onMouseLeave={() => !isNavOpen && setShowCatMenu(false)}
          >
            <span className="nav-link d-flex align-items-center gap-1" style={{ cursor: 'pointer' }} onClick={() => isNavOpen && setShowCatMenu(true)}>
              Thể loại <span style={{fontSize: '10px'}}>▼</span>
            </span>
            {/* Desktop Dropdown */}
            {showCatMenu && !isNavOpen && (
              <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', paddingTop: '8px', zIndex: 1000 }}>
                <div className="custom-dropdown shadow-lg rounded-4 p-3 animate-fade-in" style={{
                  width: '500px',
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '8px', 
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'var(--bg-secondary)',
                }}>
                  {categories.map(cat => (
                    <NavLink to={`/the-loai?category=${cat.id}`} key={cat.id} 
                      onClick={() => setIsNavOpen(false)}
                      className="text-decoration-none dropdown-item-custom px-3 py-2 rounded-3 transition d-flex align-items-center" 
                      style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {cat.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>

          <NavLink to="/lich-su" onClick={() => setIsNavOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Lịch sử</NavLink>
        </div>

        <div className="nav-actions">
          <NavLink to="/bookmarks" onClick={() => setIsNavOpen(false)} className={({ isActive }) => `icon-btn ${isActive ? 'text-accent' : ''}`} aria-label="Bookmarks">
            <Bookmark size={20} fill="currentColor" className={window.location.pathname === '/bookmarks' ? 'text-warning' : ''} />
          </NavLink>

          <div className="position-relative d-flex align-items-center rounded-pill px-3 py-1 border transition"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--glass-border)' }}
            ref={searchContainerRef}>
            <Search size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="bg-transparent border-0 ms-2 shadow-none"
              placeholder="Tìm truyện..."
              style={{ outline: 'none', width: '130px', fontSize: '0.85rem', color: 'var(--text-primary)' }}
              value={searchQuery}
              onFocus={() => { if (searchQuery.length > 1) setShowSearchDropdown(true); }}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />

            {/* Khung Gợi Ý Dropdown Khoảng Cách Nhỏ */}
            {showSearchDropdown && (
              <div className="custom-dropdown shadow-lg rounded p-2"
                style={{
                  position: 'absolute', top: '120%', right: '0', minWidth: '350px', zIndex: 1100,
                  border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '5px',
                  backgroundColor: 'var(--bg-secondary)'
                }}>
                {isSearching ? (
                  <div className="text-secondary text-center p-3 fs-6">Đang quét kho truyện...</div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="text-secondary fs-6 mb-1 px-2 border-bottom border-secondary border-opacity-25 pb-1">
                      Kết quả tìm kiếm ({searchResults.length}+)
                    </div>
                    {searchResults.map(comic => (
                      <NavLink
                        to={`/comic/${comic.id}`}
                        key={comic.id}
                        onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); setIsNavOpen(false); }}
                        className="d-flex gap-3 align-items-center p-2 rounded text-decoration-none dropdown-item-custom"
                      >
                        <img src={comic.coverUrl} alt="cover" style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-bold text-truncate" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {comic.title}
                          </div>
                          <div className="text-secondary text-truncate" style={{ fontSize: '0.75rem' }}>
                            {comic.author || 'Đang cập nhật'} • {comic.isAdult ? ' 18+' : 'Safe'}
                          </div>
                        </div>
                      </NavLink>
                    ))}
                    <div className="text-center mt-1 pt-1 border-top border-secondary border-opacity-25">
                      <span className="text-accent cursor-pointer hover-text-light" style={{ fontSize: '0.8rem' }}
                        onClick={() => { handleSearch({ key: 'Enter' }); setIsNavOpen(false); }}>
                        Xem tất cả kết quả ⯈
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-secondary text-center p-3 fs-6">
                    Không tìm thấy tác phẩm <b>"{searchQuery}"</b>.
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="icon-btn" onClick={handleToggleTheme} aria-label="Toggle Theme">
            {theme === 'DARK' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <div className="d-flex align-items-center gap-3">
              
              {user.role === 'ADMIN' && (
                  <div className="d-flex align-items-center gap-2 me-2">
                      <button className="btn btn-sm btn-outline-danger fw-bold rounded-pill" onClick={() => { navigate('/admin/dashboard'); setIsNavOpen(false); }}>
                          Crawl
                      </button>
                      <button className="btn btn-sm btn-outline-info fw-bold rounded-pill" onClick={() => { navigate('/admin/comics'); setIsNavOpen(false); }}>
                          Kho
                      </button>
                  </div>
              )}

              <div className="nav-item position-relative"
                onMouseEnter={() => setShowUserMenu(true)} 
                onMouseLeave={() => setShowUserMenu(false)}>
                
                <button className="icon-btn text-accent" aria-label="User Profile">
                  <img src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                    alt="avatar"
                    className="rounded-circle" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
                </button>
                
                {showUserMenu && (
                  <div className="custom-dropdown shadow-lg rounded p-2" style={{
                    position: 'absolute', top: '100%', right: '0', minWidth: '150px', zIndex: 1000,
                    border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-secondary)'
                  }}>
                  <div className="dropdown-item-custom px-2 py-2 fw-bold border-bottom border-secondary mb-1" style={{color: 'var(--text-primary)'}}>
                    {user.username}
                  </div>
                  <div className="dropdown-item-custom text-danger px-2 py-1 cursor-pointer d-flex align-items-center gap-2"
                    onClick={() => { logout(); setIsNavOpen(false); }}>
                    <LogOut size={16} /> Đăng xuất
                  </div>
                </div>
                )}
              </div>
            </div>
          ) : (
            <button className="icon-btn" aria-label="Login" onClick={() => { setShowAuthModal(true); setIsNavOpen(false); }}>
              <User size={20} />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE CATEGORY MODAL */}
      {isNavOpen && showCatMenu && (
        <div className="modal animate-fade-in" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1100, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ margin: '1rem auto' }}>
                <div className="modal-content shadow-lg" style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '16px'}}>
                    <div className="modal-header border-bottom border-secondary border-opacity-25 p-3 d-flex justify-content-between align-items-center">
                        <h5 className="modal-title m-0 fs-6 fw-bold text-uppercase" style={{color: 'var(--accent)'}}>
                            Danh mục Thể loại
                        </h5>
                        <button type="button" className={`btn-close ${theme === 'DARK' ? 'btn-close-white' : ''}`} onClick={(e) => { e.stopPropagation(); setShowCatMenu(false); }}></button>
                    </div>
                    <div className="modal-body p-3">
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '65vh', overflowY: 'auto'}} className="custom-scrollbar pe-2">
                            {categories.map(cat => (
                                <NavLink to={`/the-loai?category=${cat.id}`} key={cat.id} 
                                      onClick={() => { setIsNavOpen(false); setShowCatMenu(false); }}
                                      className="badge bg-secondary bg-opacity-25 border border-secondary border-opacity-50 text-decoration-none py-2 text-center hover-scale w-100" 
                                      style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}
                                >
                                  {cat.name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </nav>
  );
};

export default Navbar;
