import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../configurations/ThemeContext';
import { Eye, Star, Clock, BookOpen, ChevronRight, Bookmark, BookmarkPlus, Send } from 'lucide-react';
import { useAuth } from '../configurations/AuthContext';
import { cachedFetch } from '../services/CacheService';

const ComicDetail = () => {
  const { id } = useParams();
  const { contentMode } = useTheme();
  const { user, setShowAuthModal } = useAuth();
  const [comic, setComic] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExpandedText, setIsExpandedText] = useState(false);

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Fetch comic details
    Promise.all([
      cachedFetch(`${import.meta.env.VITE_API_BASE_URL}/comics/${id}`).then(res => res.json()),
      cachedFetch(`${import.meta.env.VITE_API_BASE_URL}/chapters/comic/${id}`).then(res => res.json())
    ])
    .then(([comicData, chaptersData]) => {
      setComic(comicData);
      // Sort chapters by chapterNumber descending (newest first)
      const sortedChapters = chaptersData.sort((a, b) => b.chapterNumber - a.chapterNumber);
      setChapters(sortedChapters);
    })
    .catch(err => console.error("Error fetching comic details:", err))
    .finally(() => setLoading(false));

    cachedFetch(`${import.meta.env.VITE_API_BASE_URL}/comments/comic/${id}`)
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) {
              setComments(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
          }
      })
      .catch(console.error);

    if (user) {
        cachedFetch(`${import.meta.env.VITE_API_BASE_URL}/bookmarks/user/${user.id}`)
          .then(res => res.json())
          .then(data => {
              if (Array.isArray(data)) {
                  setIsBookmarked(!!data.find(b => b.comic?.id === parseInt(id)));
              }
          })
          .catch(console.error);
    }
  }, [id, user]);

  const handleBookmark = () => {
      if (!user) {
          setShowAuthModal(true);
          return;
      }
      if (isBookmarked) return; // Basic mock: assume no unbookmark API yet
      
      fetch(import.meta.env.VITE_API_BASE_URL + '/bookmarks', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ user: { id: user.id }, comic: { id: parseInt(id) } })
      })
      .then(res => res.ok ? setIsBookmarked(true) : null)
      .catch(console.error);
  };

  const handlePostComment = (e) => {
      e.preventDefault();
      if (!user) return setShowAuthModal(true);
      if (!newComment.trim()) return;

      fetch(import.meta.env.VITE_API_BASE_URL + '/comments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ content: newComment, user: { id: user.id }, comic: { id: parseInt(id) } })
      })
      .then(res => res.json())
      .then(data => {
          setComments([data, ...comments]);
          setNewComment("");
      })
      .catch(console.error);
  };

  if (loading) {
    return <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <h2>Đang tải thông tin truyện...</h2>
    </div>;
  }

  if (!comic) {
    return <div className="main-content"><h2>Không tìm thấy truyện!</h2></div>;
  }

  const isDemon = contentMode === 'DEMON';
  const totalViews = comic.totalViews ? comic.totalViews.toLocaleString() : '0';

  return (
    <div className="main-content comic-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={16} />
        <span>{comic.title}</span>
      </div>

      <div className="comic-detail-container">
        {/* Left: Cover */}
        <div className="comic-detail-cover">
          <img src={comic.coverUrl} alt={comic.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        </div>

        {/* Right: Info */}
        <div className="comic-detail-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 className="comic-detail-title">{comic.title}</h1>
            <span className="badge">{comic.isAdult ? '18+' : 'Safe'}</span>
          </div>
          
          <div className="comic-detail-meta" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={18} color="orange" fill="orange" />
              <span>{comic.ratingScore || '5.0'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={18} />
              <span>{totalViews} lượt xem</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={18} />
              <span>{chapters.length} chapters</span>
            </div>
          </div>

          <div className="comic-detail-description">
            <h3>Nội Dung:</h3>
            <p>
              {comic.description && comic.description.length > 200 && !isExpandedText 
                ? comic.description.substring(0, 200) + '... ' 
                : comic.description}
              {comic.description && comic.description.length > 200 && (
                <span 
                  onClick={() => setIsExpandedText(!isExpandedText)}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isExpandedText ? ' (Rút gọn)' : ' Xem thêm'}
                </span>
              )}
            </p>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {chapters.length > 0 && (
              <Link to={`/comic/${id}/chapter/${chapters[chapters.length - 1].id}`} className={`btn ${isDemon ? 'btn-demon' : 'btn-primary'}`}>
                Đọc Từ Đầu
              </Link>
            )}
            {chapters.length > 0 && (
              <Link to={`/comic/${id}/chapter/${chapters[0].id}`} className="btn btn-secondary">
                Đọc Mới Nhất
              </Link>
            )}
            <button 
                className={`btn ${isBookmarked ? 'btn-success' : 'btn-outline-primary'} d-flex align-items-center gap-2`}
                onClick={handleBookmark}
                disabled={isBookmarked}
            >
                {isBookmarked ? <Bookmark size={18} fill="currentColor" /> : <BookmarkPlus size={18} />}
                {isBookmarked ? 'Đã Lưu' : 'Lưu Truyện'}
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="chapters-container">
        <h2>Danh sách Chapter</h2>
        <div className="chapter-list custom-scrollbar" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
          {chapters.length === 0 ? (
            <p>Truyện chưa có chapter nào.</p>
          ) : (
            chapters.map(chapter => (
              <Link to={`/comic/${id}/chapter/${chapter.id}`} key={chapter.id} className="chapter-item">
                <span className="chapter-name">{chapter.title || `Chapter ${chapter.chapterNumber}`}</span>
                <span className="chapter-meta">
                  <Clock size={14} style={{ marginRight: '4px' }} />
                  {chapter.viewCount ? chapter.viewCount.toLocaleString() : 0} views
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Bình Luận Section */}
      <div className="comments-container mt-4 p-4 rounded" style={{background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)'}}>
        <h3 className="mb-4">Bình Luận ({comments.length})</h3>
        
        {user ? (
          <form className="mb-4 d-flex gap-2" onSubmit={handlePostComment}>
            <img src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} 
                 alt="avatar" className="rounded-circle" style={{width: '40px', height: '40px', objectFit: 'cover'}} loading="lazy" decoding="async" />
            <div className="flex-grow-1 position-relative">
               <input 
                  type="text" 
                  className="form-control bg-dark border-secondary text-light w-100" 
                  placeholder="Thêm bình luận..." 
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ borderRadius: '20px', paddingRight: '40px' }}
               />
               <button type="submit" className="btn btn-link position-absolute" style={{right: '5px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)'}}>
                  <Send size={18} />
               </button>
            </div>
          </form>
        ) : (
          <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-4">
             <span>Vui lòng đăng nhập để chém gió cùng anh em!</span>
             <button className="btn btn-sm btn-primary fw-bold" onClick={() => setShowAuthModal(true)}>Đăng Nhập Ngay</button>
          </div>
        )}

        <div className="d-flex flex-column gap-3">
          {comments.map(cmt => (
            <div key={cmt.id} className="d-flex gap-3 bg-dark p-3 rounded border border-secondary border-opacity-25">
               <img src={cmt.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${cmt.user?.username}`} 
                    alt="avatar" className="rounded-circle mt-1" style={{width: '36px', height: '36px', objectFit: 'cover'}} loading="lazy" decoding="async" />
               <div>
                  <div className="fw-bold mb-1" style={{fontSize: '0.9rem'}}>
                    {cmt.user?.username || 'Ẩn danh'} 
                    <span className="text-secondary fw-normal ms-2" style={{fontSize: '0.75rem'}}>
                       {new Date(cmt.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{fontSize: '0.95rem'}}>{cmt.content}</div>
               </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-secondary fst-italic">Truyện chưa có bình luận nào. Hãy là người đầu tiên!</p>}
        </div>
      </div>

    </div>
  );
};

export default ComicDetail;
