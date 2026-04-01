import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './configurations/ThemeContext';
import { AuthProvider } from './configurations/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AuraWidget from './components/AuraWidget';
import Home from './pages/Home';
import ComicDetail from './pages/ComicDetail';
import ChapterDetail from './pages/ChapterDetail';
import FilterPage from './pages/FilterPage';
import BookmarksPage from './pages/BookmarksPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminComicManager from './pages/AdminComicManager';

import Footer from './components/Footer';

// Keepalive: Ping backend mỗi 4 phút để tránh Render spin down
const PING_URL = (import.meta.env.VITE_API_BASE_URL || '').replace('/api', '') + '/api/ping';
const PING_INTERVAL = 4 * 60 * 1000; // 4 phút

function App() {
  // Keepalive: tự động ping backend mỗi 4 phút khi user đang mở web
  useEffect(() => {
    const pingBackend = () => {
      fetch(PING_URL, { method: 'GET', mode: 'cors' }).catch(() => {});
    };
    pingBackend(); // Ping ngay khi mở web
    const interval = setInterval(pingBackend, PING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <AuthModal />
              <AuraWidget />
              <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/the-loai" element={<FilterPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/comic/:id" element={<ComicDetail />} />
                  <Route path="/comic/:id/chapter/:chapterId" element={<ChapterDetail />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/comics" element={<AdminComicManager />} />
                </Routes>
              </main>
              <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
