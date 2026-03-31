import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, themeColors } from '../configurations/ThemeContext';
import { Star, TrendingUp, Clock, ArrowRight, Search, MessageCircle, MoreHorizontal } from 'lucide-react';
import ComicCard from '../components/ComicCard';
import { cachedFetch } from '../services/CacheService';

const Home = () => {
  const { contentMode, setContentMode, themeColor, theme } = useTheme();
  const navigate = useNavigate();
  const [comics, setComics] = useState([]);
  const [recentComments, setRecentComments] = useState([]);

  // Carousel states
  const marqueeRef = React.useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Pagination for Recent Comics
  const [recentPage, setRecentPage] = useState(0);
  const ITEMS_PER_PAGE = 28; // 7 rows * 4 items
  
  // Category Filtering
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const toggleCategory = (catId) => {
      setSelectedCategories(prev => 
          prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
      );
  };


  useEffect(() => {
    cachedFetch(import.meta.env.VITE_API_BASE_URL + '/comics')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) setComics(data);
          else console.error("API error", data);
      })
      .catch(err => console.error("Error fetching comics:", err));

    cachedFetch(import.meta.env.VITE_API_BASE_URL + '/comments/recent')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) setRecentComments(data);
      })
      .catch(err => console.error("Error fetching comments:", err));

    cachedFetch(import.meta.env.VITE_API_BASE_URL + '/categories')
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  const baseComics = comics.filter(c => contentMode === 'DEMON' ? c.isAdult : !c.isAdult);

  // 1. Lọc 15 bộ Hot nhất (Carousel)
  const hotComics = [...baseComics].sort((a,b) => (b.totalViews || 0) - (a.totalViews || 0)).slice(0, 15);
  const hotComicsIds = new Set(hotComics.map(c => c.id));

  // 2. Lọc các bộ còn lại 
  const remainingComics = baseComics.filter(c => !hotComicsIds.has(c.id));
  const poolForLowerSections = remainingComics.length > 0 ? remainingComics : baseComics;

  // 3. Top Truyện (List)
  const topRatedComics = [...poolForLowerSections].sort((a,b) => (b.ratingScore || 0) - (a.ratingScore || 0)).slice(0, 5);

  // 4. Danh Sách Cập Nhật Gần Đây (Xếp theo mới nhất và lọc Category)
  const newComics = [...baseComics]
      .filter(c => appliedCategories.length === 0 || c.categories?.some(cat => appliedCategories.includes(cat.id)))
      .sort((a, b) => {
          const dateA = new Date(a.updatedAt || 0).getTime();
          const dateB = new Date(b.updatedAt || 0).getTime();
          if (dateA === dateB) return b.id - a.id;
          return dateB - dateA;
      });

  // Auto scroll effect
  useEffect(() => {
    if (isHovered || isDragging || !marqueeRef.current || hotComics.length === 0) return;
    
    const interval = setInterval(() => {
        if (marqueeRef.current && marqueeRef.current.children.length > hotComics.length) {
            marqueeRef.current.scrollBy({ left: 1, behavior: 'auto' });
            const shiftAmount = marqueeRef.current.children[hotComics.length].offsetLeft - marqueeRef.current.children[0].offsetLeft;
            if (marqueeRef.current.scrollLeft >= shiftAmount) {
                marqueeRef.current.scrollLeft -= shiftAmount;
            }
        }
    }, 30);
    return () => clearInterval(interval);
  }, [isHovered, isDragging, hotComics.length]);
  
  // Drag to scroll handlers
  const handleMouseDown = (e) => {
      setIsDragging(true);
      setStartX(e.pageX - marqueeRef.current.offsetLeft);
      setScrollLeft(marqueeRef.current.scrollLeft);
  };
  const handleMouseLeave = () => {
      setIsDragging(false);
      setIsHovered(false);
  };
  const handleMouseUp = () => {setIsDragging(false);};
  const handleMouseMove = (e) => {
      if (!isDragging || !marqueeRef.current || hotComics.length === 0) return;
      e.preventDefault();
      const x = e.pageX - marqueeRef.current.offsetLeft;
      const walk = (x - startX) * 1.5; 
      marqueeRef.current.scrollLeft = scrollLeft - walk;

      if (marqueeRef.current.children.length > hotComics.length * 2) {
          const shiftAmount = marqueeRef.current.children[hotComics.length].offsetLeft - marqueeRef.current.children[0].offsetLeft;
          if (marqueeRef.current.scrollLeft <= 0.1 * shiftAmount) {
              marqueeRef.current.scrollLeft += shiftAmount;
              setScrollLeft(scrollLeft + shiftAmount);
          } else if (marqueeRef.current.scrollLeft >= 1.9 * shiftAmount) {
              marqueeRef.current.scrollLeft -= shiftAmount;
              setScrollLeft(scrollLeft - shiftAmount);
          }
      }
  };

  return (
    <div className="main-content" style={{
        paddingTop: '0', 
        marginTop: "100px", 
        background: 'transparent',
        transition: 'background 0.5s ease',
        minHeight: '100vh',
        borderRadius: '16px'
    }}>
      
      {/* 1. Hot Comics Marquee (Căng full width trong main-content) */}
      <div className="mb-2" style={{ zIndex: 10, position: 'relative', margin: '0 -4rem', width: 'calc(100% + 8rem)' }}>

          <div className="flex-grow-1 overflow-hidden">
            {hotComics.length > 0 && (
                <div className="hot-marquee-container position-relative mb-0 px-4" style={{background: 'transparent', boxShadow: 'none', borderBottom: 'none'}}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="fw-bold d-flex align-items-center gap-2 m-0 fs-6" style={{color: contentMode === 'DEMON' ? 'var(--demon-accent)' : 'var(--accent)'}}>
                          <TrendingUp size={20} /> Truyện Đọc Truyền Tay Hot Nhất
                      </h5>
                  </div>
                  {(() => {
                    const copiesNeeded = Math.max(3, Math.ceil(20 / hotComics.length));
                    const carouselItems = Array(copiesNeeded).fill(hotComics).flat();
                    
                    return (
                      <div 
                          className="hot-marquee-track custom-scrollbar-hide" 
                          ref={marqueeRef}
                          onMouseEnter={() => setIsHovered(true)}
                          onMouseLeave={handleMouseLeave}
                          onMouseDown={handleMouseDown}
                          onMouseUp={handleMouseUp}
                          onMouseMove={handleMouseMove}
                          style={{
                            display: 'flex', gap: '1rem', overflowX: 'auto', 
                            scrollBehavior: 'auto', paddingBottom: '0.5rem',
                            msOverflowStyle: 'none', scrollbarWidth: 'none',
                            cursor: isDragging ? 'grabbing' : 'grab'
                          }}
                      >
                          {carouselItems.map((comic, index) => (
                              <ComicCard key={`hot-${comic.id}-${index}`} comic={comic} isHotCarouselItem={true} />
                          ))}
                      </div>
                    );
                  })()}
                </div>
            )}
          </div>
      </div>

      {/* 2. Banner Tìm Kiếm */}
      <section className="hero-section" style={{padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, position: 'relative'}}>
        
        <div className="anime-btn-container">
            {/* Dynamic Character that pops up on hover depends on Aura */}
            <img 
                src={themeColors[themeColor].charImg} 
                alt="character popup" 
                referrerPolicy="no-referrer"
                className="anime-character-popover" 
                style={{ width: '250px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
                loading="lazy" decoding="async"
            />
            <button 
                className="anime-dynamic-btn"
                style={{
                   borderColor: themeColors[themeColor].color,
                   boxShadow: `0 0 15px ${themeColors[themeColor].color}40, inset 0 0 10px ${themeColors[themeColor].color}33`
                }}
                onClick={() => navigate('/the-loai')}
            >
                <Search size={22} className="me-2" />
                <span style={{zIndex: 2, position: 'relative', textShadow: `0 0 8px ${themeColors[themeColor].color}`}}>
                    Tìm Kiếm Chuyên Sâu Ngay
                </span>
            </button>
        </div>
      </section>

      {/* 3. Main Grid Layout (Cập Nhật & Sidebar Top/Comments) */}
      <div className="row g-4 mb-4">
          
          {/* CỘT TRÁI: Cập Nhật Gần Đây */}
          <div className="col-lg-8">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2 gap-2">
                  <div className="d-flex align-items-center flex-wrap gap-2">
                      <h5 className="fw-bold d-flex align-items-center gap-2 m-0 text-info fs-6 text-nowrap me-2">
                          <Clock size={20} /> Cập Nhật Gần Đây
                      </h5>
                      <div className="d-flex flex-wrap gap-1 align-items-center">
                          <span 
                              className={`badge cursor-pointer px-2 py-1 bg-success text-light shadow-sm`}
                              onClick={() => {setAppliedCategories([]); setSelectedCategories([]); setRecentPage(0);}}
                              style={{
                                  fontSize: '0.7rem', 
                                  opacity: 1, 
                                  border: appliedCategories.length === 0 ? '2px solid white' : '2px solid transparent'
                              }}
                          >
                              Tất Cả
                          </span>
                          {categories.slice(0, 4).map((cat, idx) => {
                              const isSelected = appliedCategories.length === 1 && appliedCategories[0] === cat.id;
                              return (
                                  <span key={cat.id} 
                                        className={`badge cursor-pointer px-2 py-1 tag-color-${(idx % 4) + 1} text-light shadow-sm`}
                                        onClick={() => {
                                            // Single select outdoors
                                            const newApplied = [cat.id];
                                            setAppliedCategories(newApplied);
                                            setSelectedCategories(newApplied);
                                            setRecentPage(0);
                                        }}
                                        style={{
                                            fontSize: '0.7rem', 
                                            opacity: 1,
                                            border: isSelected ? '2px solid white' : '2px solid transparent'
                                        }}
                                  >
                                      {cat.name}
                                  </span>
                              );
                          })}
                          {categories.length > 4 && (
                              <span className="badge bg-dark border border-secondary text-secondary cursor-pointer hover-bg-secondary px-2 py-1" 
                                    onClick={() => {
                                        setSelectedCategories(appliedCategories);
                                        setShowCategoryModal(true);
                                    }}
                              >
                                  <MoreHorizontal size={14} />
                              </span>
                          )}
                      </div>
                  </div>

                  <div className="d-flex gap-2 align-items-center">
                      <div className="text-secondary small me-2">Trang {recentPage + 1}</div>
                      <button 
                          className="btn btn-sm btn-outline-secondary py-0 px-2" 
                          disabled={recentPage === 0} 
                          onClick={() => setRecentPage(p => p - 1)}
                      >&lt;</button>
                      <button 
                          className="btn btn-sm btn-outline-secondary py-0 px-2" 
                          disabled={(recentPage + 1) * ITEMS_PER_PAGE >= newComics.length} 
                          onClick={() => setRecentPage(p => p + 1)}
                      >&gt;</button>
                  </div>
              </div>
              
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-3 mb-4">
                  {newComics.slice(recentPage * ITEMS_PER_PAGE, (recentPage + 1) * ITEMS_PER_PAGE).map((comic) => (
                      <div className="col" key={comic.id}>
                          <ComicCard comic={comic} />
                      </div>
                  ))}
              </div>
          </div>

          {/* CỘT PHẢI: Sidebar Xếp Hạng & Bình Luận */}
          <div className="col-lg-4">
              
              {/* TOP TRUYỆN */}
              <div className="mb-4">
                  <h5 className="fw-bold d-flex align-items-center gap-2 mb-3 border-bottom border-secondary border-opacity-25 pb-2 text-warning fs-6">
                      <Star size={20} /> Bảng Xếp Hạng
                  </h5>
                  <div className="d-flex flex-column gap-3">
                      {topRatedComics.map((comic, index) => (
                          <div key={comic.id} 
                               className="d-flex align-items-center gap-3 p-2 rounded transition hover-bg-secondary cursor-pointer"
                               onClick={() => navigate(`/comic/${comic.id}`)}
                               style={{background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)'}}
                          >
                              <div className="fw-bold fs-5 text-secondary" style={{width: '24px', textAlign: 'center'}}>{index + 1}</div>
                              <img src={comic.coverUrl} alt={comic.title} 
                                   className="rounded top-comic-img" 
                                   style={{width: '45px', height: '60px', objectFit: 'cover'}} loading="lazy" decoding="async" />
                              <div className="flex-grow-1 overflow-hidden">
                                  <h6 className="mb-1 text-truncate fs-6" style={{fontSize: '0.9rem'}}>{comic.title}</h6>
                                  <div className="small text-secondary d-flex align-items-center gap-2" style={{fontSize: '0.75rem'}}>
                                      <span><Star size={12} className="text-warning"/> {comic.ratingScore || 'N/A'}</span>
                                      <span>Lượt xem: {comic.totalViews || 0}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* BÌNH LUẬN GẦN ĐÂY */}
              <div>
                  <h5 className="fw-bold d-flex align-items-center gap-2 mb-3 border-bottom border-secondary border-opacity-25 pb-2 text-success fs-6">
                      <MessageCircle size={20} /> Bình Luận Gần Đây
                  </h5>
                  <div className="d-flex flex-column gap-3 custom-scrollbar" style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'}}>
                      {(() => {
                          const displayComments = recentComments.filter(cmt => contentMode === 'DEMON' ? cmt.comic?.isAdult : !cmt.comic?.isAdult);
                          if (displayComments.length === 0) {
                              return <div className="text-secondary small text-center p-3">Chưa có bình luận nào.</div>;
                          }
                          return displayComments.map(cmt => (
                              <div key={cmt.id} className="p-3 mb-2 shadow-sm" style={{background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '16px'}}>
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                      <img src={cmt.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${cmt.user?.username}`} 
                                           alt="avatar" 
                                           className="rounded-circle comment-avatar" 
                                           style={{width: '28px', height: '28px', objectFit: 'cover'}} loading="lazy" decoding="async" />
                                      <div className="fw-bold text-truncate" style={{fontSize: '0.9rem', color: 'var(--text-primary)'}}>{cmt.user?.username || 'Ẩn danh'}</div>
                                      <span className="ms-auto" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                          {new Date(cmt.createdAt).toLocaleDateString()}
                                      </span>
                                  </div>
                                  <div className="fst-italic ps-1" style={{fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.9}}>"{cmt.content}"</div>
                                  <div className="mt-2 text-end">
                                      <span 
                                         className="badge bg-primary bg-opacity-10 text-primary border border-primary rounded-pill px-2 py-1 cursor-pointer hover-scale" 
                                         style={{fontSize: '0.7rem'}}
                                         onClick={() => {
                                             setContentMode(cmt.comic?.isAdult ? 'DEMON' : 'FAMILY');
                                             navigate(`/comic/${cmt.comic?.id}`);
                                         }}
                                      >
                                          {cmt.comic?.title?.substring(0, 20)}...
                                      </span>
                                  </div>
                              </div>
                          ));
                      })()}
                  </div>
              </div>

          </div>
      </div>

      {/* MODAL DANH MỤC THỂ LOẠI */}
      {showCategoryModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content text-light" style={{background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)'}}>
                    <div className="modal-header border-bottom border-secondary border-opacity-25">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <Search size={20} className={contentMode === 'DEMON' ? 'text-danger' : 'text-primary'} /> 
                            Lọc Nhanh Theo Thể Loại ({categories.length})
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowCategoryModal(false)}></button>
                    </div>
                    <div className="modal-body custom-scrollbar" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                        <div className="d-flex flex-wrap gap-2">
                            <span 
                                className={`badge fs-6 cursor-pointer px-3 py-2 hover-scale ${selectedCategories.length === 0 ? (contentMode === 'DEMON' ? 'bg-danger' : 'bg-primary') : 'bg-dark border border-secondary text-secondary'}`}
                                onClick={() => setSelectedCategories([])}
                            >
                                ✨ Lọc Thập Cẩm (Tất Cả)
                            </span>
                            {categories.map(cat => {
                                const isSelected = selectedCategories.includes(cat.id);
                                return (
                                    <span 
                                        key={cat.id}
                                        className={`badge fs-6 cursor-pointer px-3 py-2 hover-scale ${isSelected ? `tag-color-${cat.id % 5}` : 'bg-dark border border-secondary text-secondary hover-bg-secondary'}`}
                                        onClick={() => toggleCategory(cat.id)}
                                    >
                                        {cat.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <div className="modal-footer border-top border-secondary border-opacity-25 py-2 px-3">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowCategoryModal(false)}>Hủy</button>
                        <button 
                            className={`btn btn-sm ${contentMode === 'DEMON' ? 'btn-danger' : 'btn-primary'}`} 
                            onClick={() => {
                                setAppliedCategories(selectedCategories); 
                                setRecentPage(0); 
                                setShowCategoryModal(false);
                            }}
                        >
                            Xác Nhận Lọc ({selectedCategories.length} Thể Loại)
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Home;
