import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../configurations/ThemeContext';
import { Flame, Star, Search, Filter, MessageCircle, Eye, Clock, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import ComicCard from '../components/ComicCard';

const FilterPage = () => {
  const { contentMode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comics, setComics] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTagModal, setShowTagModal] = useState(false);
  const itemsPerPage = 35; // 7 rows x 5 columns

  const urlCategoryId = searchParams.get('category');
  const urlKeyword = searchParams.get('keyword');

  useEffect(() => {
    if (urlKeyword !== null) {
      setSearchQuery(urlKeyword);
    }
  }, [urlKeyword]);

  useEffect(() => {
    // Fetch configs
    fetch(import.meta.env.VITE_API_BASE_URL + '/tags')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setTags(d);
        else console.error("Tags API error", d);
      })
      .catch(e => console.error(e));

    // Fetch comics
    fetch(import.meta.env.VITE_API_BASE_URL + '/comics')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComics(data);
        else console.error("Comics API error", data);
      })
      .catch(err => {
        console.error("Error fetching comics:", err);
      });
  }, []);

  // Filter and Sort Logic
  const getProcessedComics = () => {
    let filtered = comics.filter(c => contentMode === 'DEMON' ? c.isAdult : !c.isAdult);

    if (searchQuery.trim()) {
      filtered = filtered.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (urlCategoryId) {
      filtered = filtered.filter(c => c.categories && c.categories.some(cat => cat.id === parseInt(urlCategoryId)));
    }

    if (activeTag !== 'all') {
      filtered = filtered.filter(c => c.tags && c.tags.some(t => t.id === parseInt(activeTag)));
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'views': return (b.totalViews || 0) - (a.totalViews || 0);
        case 'rating': return (b.ratingScore || 0) - (a.ratingScore || 0);
        case 'comments': return (b.commentsCount || 0) - (a.commentsCount || 0);
        case 'latest': 
        default:
          return b.id - a.id;
      }
    });

    return filtered;
  };

  const processedComics = getProcessedComics();
  
  // Pagination logic
  const totalPages = Math.ceil(processedComics.length / itemsPerPage);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTag, urlCategoryId, sortBy, contentMode]);

  const currentComics = processedComics.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
  );

  return (
    <div className="main-content" style={{paddingTop: '2rem'}}>
      <div className="mb-4 text-center">
            <h2 className="fw-bold" style={{color: contentMode === 'DEMON' ? 'var(--demon-accent)' : 'var(--text-primary)'}}>
                Khám Phá Truyện Tranh
            </h2>
            <p className="text-secondary">Lọc và tìm kiếm theo sở thích của bạn</p>
      </div>

      {/* Unified Filter Section */}
      <section className="admin-glass-card p-4 mb-5 rounded-4" style={{border: '1px solid var(--glass-border)'}}>
          <div className="row g-4">
              {/* Search */}
              <div className="col-12 col-md-5">
                  <div className="position-relative">
                      <input 
                          type="text" 
                          placeholder="Tìm kiếm truyện tranh..." 
                          className="form-control form-control-lg border-2 shadow-sm" 
                          style={{
                            paddingRight: '3rem', 
                            borderRadius: '50px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            borderColor: contentMode === 'DEMON' ? 'var(--demon-accent)' : 'var(--accent)'
                          }}
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                      />
                      <Search size={22} style={{position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
                  </div>
              </div>

              {/* Filters & Sorting */}
              <div className="col-12 col-md-7 d-flex flex-wrap align-items-center justify-content-md-end gap-3">
                  <div className="btn-group shadow-sm" role="group">
                      <input type="radio" className="btn-check" name="sort" id="sort_latest" checked={sortBy === 'latest'} onChange={() => setSortBy('latest')}/>
                      <label className={`btn btn-outline-secondary d-flex align-items-center gap-2 px-3 ${sortBy === 'latest' ? 'text-primary border-primary bg-primary bg-opacity-10 fw-bold' : ''}`} htmlFor="sort_latest" title="Mới Nhất">
                          <Clock size={16}/> Mới Nhất
                      </label>

                      <input type="radio" className="btn-check" name="sort" id="sort_views" checked={sortBy === 'views'} onChange={() => setSortBy('views')}/>
                      <label className={`btn btn-outline-secondary d-flex align-items-center gap-2 px-3 ${sortBy === 'views' ? 'text-primary border-primary bg-primary bg-opacity-10 fw-bold' : ''}`} htmlFor="sort_views" title="Lượt Đọc">
                          <Eye size={16}/> Hấp Dẫn
                      </label>

                      <input type="radio" className="btn-check" name="sort" id="sort_rating" checked={sortBy === 'rating'} onChange={() => setSortBy('rating')}/>
                      <label className={`btn btn-outline-secondary d-flex align-items-center gap-2 px-3 ${sortBy === 'rating' ? 'text-primary border-primary bg-primary bg-opacity-10 fw-bold' : ''}`} htmlFor="sort_rating" title="Đánh Giá">
                          <Star size={16}/> Đánh Giá
                      </label>
                  </div>
              </div>
          </div>

          {/* Tags Single Row */}
          <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex gap-2 align-items-center w-100 position-relative">
              <div className="d-flex gap-3 align-items-center flex-grow-1" style={{overflow: 'hidden'}}>
                  <button 
                      className={`btn btn-sm flex-shrink-0 ${activeTag === 'all' ? (contentMode==='DEMON'?'btn-danger rounded-pill':'btn-primary rounded-pill') : 'border-0 bg-transparent text-secondary fw-semibold hover-text-primary'}`}
                      onClick={() => setActiveTag('all')}
                      style={{whiteSpace: 'nowrap'}}
                  >
                      🔥 Toàn Bộ Tag
                  </button>
                  {tags.map(tag => (
                      <button 
                          key={tag.id}
                          className={`btn btn-sm flex-shrink-0 ${activeTag === tag.id ? (contentMode==='DEMON'?'btn-danger rounded-pill':'btn-primary rounded-pill') : 'border-0 bg-transparent text-secondary fw-semibold hover-text-primary'}`}
                          onClick={() => setActiveTag(tag.id)}
                          style={{whiteSpace: 'nowrap'}}
                      >
                          {tag.name}
                      </button>
                  ))}
              </div>
              <div className="ms-2">
                  <button 
                      className="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                      style={{width: '32px', height: '32px'}}
                      onClick={() => setShowTagModal(true)}
                      title="Hiển thị tất cả thể loại"
                  >
                      ...<MoreHorizontal size={18} />
                  </button>
              </div>
          </div>
      </section>

      {/* Full Tags Modal */}
      {showTagModal && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050}} tabIndex="-1" onClick={() => setShowTagModal(false)}>
              <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
                  <div className="modal-content" style={{background: 'var(--bg-primary)', border: '1px solid var(--glass-border)'}}>
                      <div className="modal-header border-secondary border-opacity-25">
                          <h5 className="modal-title fw-bold" style={{color: 'var(--text-primary)'}}>Tất Cả Thể Loại</h5>
                          <button type="button" className="btn-close" style={{filter: contentMode==='DEMON' || document.documentElement.getAttribute('data-bs-theme')==='dark' ? 'invert(1)' : 'none'}} onClick={() => setShowTagModal(false)}></button>
                      </div>
                      <div className="modal-body p-4">
                          <div className="d-flex flex-wrap gap-2">
                             <button 
                                 className={`btn btn-sm rounded-pill ${activeTag === 'all' ? (contentMode==='DEMON'?'btn-danger':'btn-primary') : 'btn-outline-secondary'}`}
                                 onClick={() => { setActiveTag('all'); setShowTagModal(false); }}
                             >
                                 🔥 Toàn Bộ Tag
                             </button>
                             {tags.map(tag => (
                                 <button 
                                     key={tag.id}
                                     className={`btn btn-sm rounded-pill ${activeTag === tag.id ? (contentMode==='DEMON'?'btn-danger':'btn-primary') : 'btn-outline-secondary'}`}
                                     onClick={() => { setActiveTag(tag.id); setShowTagModal(false); }}
                                 >
                                     {tag.name}
                                 </button>
                             ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Grid Display */}
      <section className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-4 px-2">
              <Filter size={20} className="text-secondary" />
              <h4 className="m-0 fw-bold text-secondary">
                  {urlCategoryId ? `Kết Quả Trong Thể Loại` : `Kết Quả Truyện Tranh`} 
              </h4>
              <span className="badge bg-secondary ms-2 rounded-pill px-3 py-1">{processedComics.length} kết quả</span>
          </div>

          {currentComics.length === 0 ? (
              <div className="text-center py-5 text-secondary admin-glass-card rounded-4">
                  <h4 className="fw-bold">Không tìm thấy sản phẩm!</h4>
                  <p>Từ khóa "{searchQuery || 'trống'}" không khớp với cuốn truyện nào. Thử tìm kiếm lại từ đầu nhé.</p>
                  <button className="btn btn-outline-secondary mt-2 rounded-pill px-4" onClick={() => {setSearchQuery(''); setActiveTag('all'); setSearchParams({}); setSortBy('latest');}}>
                      Xóa tất cả bộ lọc
                  </button>
              </div>
          ) : (
              <>
                  <div className="comic-grid">
                  {currentComics.map((comic) => (
                      <ComicCard key={comic.id} comic={comic} />
                  ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                      <div className="pagination-controls">
                          <button 
                              className="page-btn" 
                              disabled={currentPage === 1}
                              onClick={() => {setCurrentPage(1); window.scrollTo({top: 0, behavior: 'smooth'});}}
                          >
                              &laquo;
                          </button>
                          <button 
                              className="page-btn" 
                              disabled={currentPage === 1}
                              onClick={() => {setCurrentPage(prev => prev - 1); window.scrollTo({top: 0, behavior: 'smooth'});}}
                          >
                              <ChevronLeft size={18}/>
                          </button>
                          
                          {[...Array(totalPages)].map((_, i) => {
                              const pageStr = i + 1;
                              if (pageStr === 1 || pageStr === totalPages || Math.abs(currentPage - pageStr) <= 2) {
                                  return (
                                      <button 
                                          key={pageStr}
                                          className={`page-btn ${currentPage === pageStr ? 'active' : ''}`}
                                          onClick={() => {setCurrentPage(pageStr); window.scrollTo({top: 0, behavior: 'smooth'});}}
                                      >
                                          {pageStr}
                                      </button>
                                  );
                              } else if (pageStr === currentPage - 3 || pageStr === currentPage + 3) {
                                  return <span key={`dots-${pageStr}`} className="text-secondary mx-1">...</span>;
                              }
                              return null;
                          })}

                          <button 
                              className="page-btn" 
                              disabled={currentPage === totalPages}
                              onClick={() => {setCurrentPage(prev => prev + 1); window.scrollTo({top: 0, behavior: 'smooth'});}}
                          >
                              <ChevronRight size={18}/>
                          </button>
                          <button 
                              className="page-btn" 
                              disabled={currentPage === totalPages}
                              onClick={() => {setCurrentPage(totalPages); window.scrollTo({top: 0, behavior: 'smooth'});}}
                          >
                              &raquo;
                          </button>
                      </div>
                  )}
              </>
          )}
      </section>
    </div>
  );
};

export default FilterPage;
