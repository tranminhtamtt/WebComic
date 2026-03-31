import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Star, Bookmark } from 'lucide-react';

const getDaysAgo = (dateString) => {
    if (!dateString) return "Mới";
    const days = Math.floor((new Date() - new Date(dateString)) / 86400000);
    if (days === 0) return "Hôm nay";
    return `${days} Ngày Trước`;
};

const formatChapterTitle = (title) => {
    if (!title) return "Chương Mới";
    // Nếu chỉ là số thì thêm chữ Chapter
    if (!isNaN(title) || /^\d/.test(title)) return `Chapter ${title}`;
    // Nếu chưa có chữ chapter/chương thì thêm vào
    const lower = title.toLowerCase();
    if (lower.includes('chapter') || lower.includes('chương') || lower.includes('chap')) return title;
    return `Chapter ${title}`;
};

const ComicCard = ({ comic, isHotCarouselItem }) => {
    const [isBookmarked, setIsBookmarked] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
            return !!saved.find(b => b.id === comic.id);
        } catch { return false; }
    });

    const toggleBookmark = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        try {
            let saved = JSON.parse(localStorage.getItem('guest_bookmarks') || '[]');
            if (isBookmarked) {
                saved = saved.filter(b => b.id !== comic.id);
            } else {
                saved.push({ id: comic.id, title: comic.title, coverUrl: comic.coverUrl, latestChapterTitle: comic.latestChapterTitle });
            }
            localStorage.setItem('guest_bookmarks', JSON.stringify(saved));
            setIsBookmarked(!isBookmarked);
            window.dispatchEvent(new Event('bookmarksUpdated'));
        } catch {}
    };

    if (isHotCarouselItem) {
        return (
            <Link to={`/comic/${comic.id}`} className="hot-carousel-card position-relative shadow-sm" draggable="false">
                <div className="hot-carousel-img-wrapper position-relative" style={{ width: '180px', height: '240px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={comic.coverUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={comic.title} draggable="false" />
                    
                    {/* Badges Overlay */}
                    <div className="position-absolute top-0 start-0 w-100 p-2 d-flex justify-content-between align-items-start pointer-event-none">
                        <div className="d-flex gap-1 align-items-center pointer-event-none">
                            <span className="badge rounded px-2 py-1 shadow-sm" style={{backgroundColor: '#38bdf8', color: '#fff', fontSize: '0.7rem', fontWeight: 600}}>
                                {getDaysAgo(comic.updatedAt)}
                            </span>
                            <span className="badge badge-hot-blink rounded px-2 py-1 shadow-sm" style={{backgroundColor: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 600}}>
                                Hot
                            </span>
                        </div>
                        <div 
                            className="rounded p-1 text-light shadow-sm d-flex align-items-center justify-content-center hover-scale"
                            onClick={toggleBookmark}
                            style={{pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)'}}
                        >
                            <Bookmark size={16} fill={isBookmarked ? '#f59e0b' : 'transparent'} color={isBookmarked ? '#f59e0b' : '#fff'} />
                        </div>
                    </div>
                    
                    <div className="position-absolute bottom-0 start-0 w-100 p-2 pointer-event-none" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'}}>
                        <div className="text-light fw-bold text-truncate" style={{fontSize: '0.95rem'}}>{comic.title}</div>
                        <div className="text-warning fw-semibold mt-1" style={{fontSize: '0.8rem'}}>
                            {formatChapterTitle(comic.latestChapterTitle)}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link to={`/comic/${comic.id}`} className="comic-card position-relative" draggable="false">
            <div className="comic-cover-container position-relative">
                <img className="comic-cover" src={comic.coverUrl} alt={comic.title} draggable="false" />
                {/* Badges Overlay cho các truyện thường */}
                <div className="position-absolute top-0 start-0 w-100 p-2 d-flex justify-content-between align-items-start pointer-event-none">
                    <div className="d-flex gap-1 align-items-center pointer-event-none">
                        <span className="badge rounded px-1 shadow-sm" style={{backgroundColor: '#38bdf8', color: '#fff', fontSize: '0.65rem', fontWeight: 600}}>
                            {getDaysAgo(comic.updatedAt)}
                        </span>
                        {comic.totalViews > 0 && ( /* Lấy từ db, trên 0 views là hot cho dễ test */
                        <span className="badge badge-hot-blink rounded px-1 shadow-sm" style={{backgroundColor: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 600}}>
                            Hot
                        </span>
                        )}
                    </div>
                    <div 
                        className="rounded p-1 text-light shadow-sm d-flex align-items-center justify-content-center hover-scale"
                        onClick={toggleBookmark}
                        style={{pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)'}}
                    >
                        <Bookmark size={14} fill={isBookmarked ? '#f59e0b' : 'transparent'} color={isBookmarked ? '#f59e0b' : '#fff'} />
                    </div>
                </div>
            </div>
            <div className="comic-info mt-2 px-1">
                <div className="comic-title text-truncate" title={comic.title}>{comic.title}</div>
                <div className="fw-bold mb-1" style={{fontSize: '0.8rem', color: '#d97706'}}>
                    {formatChapterTitle(comic.latestChapterTitle)}
                </div>
            </div>
        </Link>
    );
}

export default ComicCard;
