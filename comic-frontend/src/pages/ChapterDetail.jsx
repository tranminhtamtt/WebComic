import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../configurations/ThemeContext';
import { ChevronLeft, ChevronRight, Home, List, ArrowUp } from 'lucide-react';

const ChapterDetail = () => {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const { contentMode } = useTheme();
  
  const [comic, setComic] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [images, setImages] = useState([]);
  const [allChapters, setAllChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);
  const [lazyLoad, setLazyLoad] = useState(true);
  const topAnchorRef = React.useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    
    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL}/comics/${id}`).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/chapters/${chapterId}`).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/chapter-images/chapter/${chapterId}`).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/chapters/comic/${id}`).then(res => res.json())
    ])
    .then(([comicData, chapterData, imagesData, allChaptersData]) => {
      setComic(comicData);
      setChapter(chapterData);
      
      const sortedImages = imagesData.sort((a, b) => a.pageNumber - b.pageNumber);
      setImages(sortedImages);
      
      const sortedChapters = allChaptersData.sort((a, b) => a.chapterNumber - b.chapterNumber);
      setAllChapters(sortedChapters);
    })
    .catch(err => console.error("Error fetching chapter details:", err))
    .finally(() => setLoading(false));
  }, [id, chapterId]);

  useEffect(() => {
    if (loading || !topAnchorRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Nếu cái mỏ neo ở trên cùng chạy ra khỏi màn hình (nghĩa là user đã cuộn xuống)
        setShowScroll(!entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );
    observer.observe(topAnchorRef.current);
    
    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return (
      <div className="main-content flex-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Đang tải nội dung chapter...</h2>
      </div>
    );
  }

  if (!chapter || !comic) {
    return (
      <div className="main-content flex-center" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Không tìm thấy nội dung!</h2>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Quay lại</button>
      </div>
    );
  }

  const isDemon = contentMode === 'DEMON';
  
  // Find prev/next chapter
  const currentIndex = allChapters.findIndex(c => c.id === parseInt(chapterId));
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  return (
    <div className="chapter-read-page">
      {/* Điểm mỏ neo để theo dõi việc cuộn chuột (chỉ rộng bằng 1 pixel vô hình) */}
      <div ref={topAnchorRef} style={{ position: 'absolute', top: 0, left: 0, height: '10px', width: '100%' }}></div>

      {/* Top Navigation Bar */}
      <div className={`chapter-top-bar ${isDemon ? 'demon-mode' : ''}`}>
        <div className="top-bar-left">
          <Link to="/" className="top-bar-btn" title="Trang chủ"><Home size={20} /></Link>
          <Link to={`/comic/${id}`} className="top-bar-btn" title="Danh sách chương"><List size={20} /></Link>
        </div>
        
        <div className="top-bar-center">
          <h2 className="chapter-comic-title">{comic.title}</h2>
          <span className="chapter-subtitle"> - {chapter.title || `Chapter ${chapter.chapterNumber}`}</span>
        </div>
        
        <div className="top-bar-right">
          {/* Nút Tắt/Bật Lazy Load */}
          <button 
            className="top-bar-btn d-none d-md-flex" 
            onClick={() => setLazyLoad(!lazyLoad)}
            title={lazyLoad ? "Đang bật Tải từng phần (Lazy). Bấm để Tải tất cả ảnh cùng lúc" : "Đang tải cả Chapter. Bấm để bật lại Tải chậm"}
            style={{ 
              width: 'auto',
              marginRight: '12px', 
              fontSize: '0.8rem', 
              padding: '4px 10px', 
              borderRadius: '6px',
              border: `1px solid ${lazyLoad ? 'var(--text-secondary)' : '#0dcaf0'}`,
              color: lazyLoad ? 'var(--text-secondary)' : '#0dcaf0',
              backgroundColor: 'transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            {lazyLoad ? "⚡ Tải Chậm" : "🚀 Tải Full"}
          </button>
          
          <button 
            className="top-bar-btn" 
            onClick={() => prevChapter && navigate(`/comic/${id}/chapter/${prevChapter.id}`)}
            disabled={!prevChapter}
            style={{ opacity: prevChapter ? 1 : 0.5, cursor: prevChapter ? 'pointer' : 'not-allowed' }}
            title="Chapter trước"
          >
            <ChevronLeft size={24} />
          </button>
          
          <select 
            className="chapter-selector"
            value={chapterId}
            onChange={(e) => navigate(`/comic/${id}/chapter/${e.target.value}`)}
          >
            {allChapters.map(c => (
              <option key={c.id} value={c.id}>
                {c.title || `Chapter ${c.chapterNumber}`}
              </option>
            ))}
          </select>
          
          <button 
            className="top-bar-btn" 
            onClick={() => nextChapter && navigate(`/comic/${id}/chapter/${nextChapter.id}`)}
            disabled={!nextChapter}
            style={{ opacity: nextChapter ? 1 : 0.5, cursor: nextChapter ? 'pointer' : 'not-allowed' }}
            title="Chapter sau"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Comic Images Container */}
      <div className="comic-images-container">
        {images.length === 0 ? (
          <div className="no-images" style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-secondary)' }}>
            <h3>Chapter này chưa có ảnh nào.</h3>
          </div>
        ) : (
          images.map((img) => (
            <img 
              key={img.id} 
              src={img.imageUrl} 
              alt={`Page ${img.pageNumber}`} 
              className="comic-page-img" 
              loading={lazyLoad ? "lazy" : "eager"} 
              decoding={lazyLoad ? "async" : "sync"}
            />
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="chapter-bottom-nav flex-column" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', width: '100%', flexWrap: 'nowrap' }}>
            <button 
              className={`btn ${isDemon ? 'btn-demon' : 'btn-primary'}`}
              onClick={() => prevChapter && navigate(`/comic/${id}/chapter/${prevChapter.id}`)}
              disabled={!prevChapter}
              style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
            >
              <ChevronLeft size={20} /> <span className="d-none d-sm-inline">Chap Trước</span>
            </button>
            
            <select 
              className="form-select bg-dark text-light border-secondary shadow-none flex-grow-1"
              style={{ maxWidth: '250px', minWidth: '120px' }}
              value={chapterId}
              onChange={(e) => navigate(`/comic/${id}/chapter/${e.target.value}`)}
            >
              {allChapters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title || `Chapter ${c.chapterNumber}`}
                </option>
              ))}
            </select>
            
            <button 
              className={`btn ${isDemon ? 'btn-demon' : 'btn-primary'}`}
              onClick={() => nextChapter && navigate(`/comic/${id}/chapter/${nextChapter.id}`)}
              disabled={!nextChapter}
              style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
            >
               <span className="d-none d-sm-inline">Chap Sau</span> <ChevronRight size={20} />
            </button>
        </div>
      </div>

      {/* Nút Cuộn Lên Đầu Trang Cuối Bài Đọc - Trôi Nổi (Floating Circle) */}
      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`btn rounded-circle position-fixed shadow-lg ${isDemon ? 'btn-demon' : 'btn-primary'}`}
        title="Lên đầu trang"
        style={{ 
          bottom: '2rem', 
          right: '2rem', 
          width: '55px', 
          height: '55px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 9999,
          opacity: showScroll ? 1 : 0,
          pointerEvents: showScroll ? 'auto' : 'none',
          transform: showScroll ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <ArrowUp style={{ width: '28px', height: '28px', flexShrink: 0 }} />
      </button>
    </div>
  );
};

export default ChapterDetail;
