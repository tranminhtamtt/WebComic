import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../configurations/ThemeContext';
import ComicCard from '../components/ComicCard';
import { Bookmark, ArrowLeft } from 'lucide-react';

const BookmarksPage = () => {
    const { contentMode } = useTheme();
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState([]);

    const loadBookmarks = () => {
        try {
            const saved = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
            setBookmarks(saved);
        } catch {
            setBookmarks([]);
        }
    };

    useEffect(() => {
        loadBookmarks();
        window.addEventListener('storage', loadBookmarks);
        window.addEventListener('bookmarksUpdated', loadBookmarks);
        return () => {
            window.removeEventListener('storage', loadBookmarks);
            window.removeEventListener('bookmarksUpdated', loadBookmarks);
        };
    }, []);

    return (
        <div className="main-content" style={{paddingTop: '2rem', minHeight: '80vh'}}>
            <div className="d-flex align-items-center mb-4 gap-3">
                <button className="btn btn-outline-secondary rounded-circle p-2" onClick={() => navigate(-1)} style={{width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <ArrowLeft size={20} />
                </button>
                <h2 className="fw-bold m-0 d-flex align-items-center gap-2" style={{color: contentMode === 'DEMON' ? 'var(--demon-accent)' : 'var(--text-primary)'}}>
                    <Bookmark size={28} /> Truyện Đã Đánh Dấu
                </h2>
            </div>
            
            {bookmarks.length === 0 ? (
                <div className="text-center py-5 text-secondary admin-glass-card rounded-4">
                    <Bookmark size={48} className="mb-3 opacity-50" />
                    <h4 className="fw-bold">Chưa có truyện nào được lưu!</h4>
                    <p>Hãy bấm vào biểu tượng Bookmark trên các thẻ truyện để lưu lại nhé.</p>
                </div>
            ) : (
                <div className="comic-grid">
                    {bookmarks.reverse().map(comic => (
                        <ComicCard key={comic.id} comic={comic} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookmarksPage;
