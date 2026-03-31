import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrapeComicList, scrapeComicDetail, scrapeChapterImages, searchComic } from '../services/scraperService';
import * as mangaDexAPI from '../services/mangadexService';
import * as damconuongAPI from '../services/damconuongService';
import * as hentaivnxAPI from '../services/hentaivnxService';
import * as sayhentaiAPI from '../services/sayhentaiService';
import { LogOut, RefreshCw, LayoutGrid, CheckCircle, DatabaseZap, Search, Eye, AlertTriangle, ChevronRight, DownloadCloud, Layers, Globe } from 'lucide-react';
import axios from 'axios';
import '../style/admin.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [scrapedList, setScrapedList] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceAPI, setSourceAPI] = useState('otruyen'); // 'otruyen' or 'mangadex'
    const [fetchType, setFetchType] = useState('latest');
    const [importMode, setImportMode] = useState('5'); // '5', '10', '20', '50', '0' (all), 'custom', 'manual'
    const [customRange, setCustomRange] = useState({ start: 1, end: 10 });
    const [selectedChapterIdxs, setSelectedChapterIdxs] = useState([]);
    const [customChapterNumbers, setCustomChapterNumbers] = useState({});
    
    // Server data states
    const [dbCategories, setDbCategories] = useState([]);
    const [dbTags, setDbTags] = useState([]);

    // Select states for current comic
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [isAdult, setIsAdult] = useState(false);
    
    // Cloudinary Custom Cover State
    const [customCoverUrl, setCustomCoverUrl] = useState('');
    const [customCoverFile, setCustomCoverFile] = useState(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    
    // Status cho việc scrape 1 truyện
    const [selectedComic, setSelectedComic] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [progress, setProgress] = useState({ state: '', percent: 0 }); // trạng thái đang parse/import
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Auth check
        const isAdmin = sessionStorage.getItem('isAdmin');
        if (!isAdmin) {
            navigate('/admin');
        } else {
            fetchDbMetadata();
        }
    }, [navigate]);

    // Auto-fetch list when clicking on a different source API button
    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        if (isAdmin && !searchQuery.trim()) {
            handleFetchList();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceAPI, fetchType]);

    const fetchDbMetadata = async () => {
        try {
            const catRes = await axios.get(import.meta.env.VITE_API_BASE_URL + '/categories');
            setDbCategories(catRes.data || []);
            
            const tagRes = await axios.get(import.meta.env.VITE_API_BASE_URL + '/tags');
            setDbTags(tagRes.data || []);
        } catch (err) {
            console.error("Failed to load map data from DB", err);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAdmin');
        navigate('/admin');
    };

    const handleFetchList = async () => {
        setLoadingList(true);
        setErrorMsg('');
        try {
            let data;
            if (sourceAPI === 'otruyen') data = await scrapeComicList(fetchType);
            else if (sourceAPI === 'mangadex') data = await mangaDexAPI.scrapeComicList(fetchType);
            else if (sourceAPI === 'damconuong') data = await damconuongAPI.scrapeComicList();
            else if (sourceAPI === 'hentaivnx') data = await hentaivnxAPI.scrapeComicList(fetchType);
            else if (sourceAPI === 'sayhentai') data = await sayhentaiAPI.scrapeComicList(fetchType);
            
            setScrapedList(data);
        } catch (error) {
            setErrorMsg(`Lỗi lấy danh sách truyện từ ${sourceAPI.toUpperCase()} API: ${error.message}`);
        } finally {
            setLoadingList(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            handleFetchList();
            return;
        }
        
        setLoadingList(true);
        setErrorMsg('');
        try {
            let data;
            if (sourceAPI === 'otruyen') data = await searchComic(searchQuery);
            else if (sourceAPI === 'mangadex') data = await mangaDexAPI.searchComic(searchQuery);
            else if (sourceAPI === 'damconuong') data = await damconuongAPI.searchComic(searchQuery);
            else if (sourceAPI === 'hentaivnx') data = await hentaivnxAPI.searchComic(searchQuery);
            else if (sourceAPI === 'sayhentai') data = await sayhentaiAPI.searchComic(searchQuery);
            
            setScrapedList(data);
        } catch (error) {
            setErrorMsg(`Lỗi tìm kiếm truyện ở ${sourceAPI.toUpperCase()}: ${error.message}`);
        } finally {
            setLoadingList(false);
        }
    };

    // Khi admin click "Xem & Duyệt"
    const handlePreviewComic = async (comic) => {
        setSelectedComic({ ...comic, detail: null });
        setSelectedCategoryIds([]);
        setSelectedTagIds([]);
        setIsAdult(false);
        setImportMode('5'); // Reset limit to default when selecting a new comic
        setSelectedChapterIdxs([]); // Reset manual selections
        setCustomChapterNumbers({}); // Reset manual numbers
        setDetailLoading(true);
        setErrorMsg('');
        setProgress({ state: 'Đang trích xuất dữ liệu truyện...', percent: 10 });
        try {
            let detail;
            if (sourceAPI === 'otruyen') detail = await scrapeComicDetail(comic.url);
            else if (sourceAPI === 'mangadex') detail = await mangaDexAPI.scrapeComicDetail(comic.url);
            else if (sourceAPI === 'damconuong') {
                detail = await damconuongAPI.scrapeComicDetail(comic.url);
                setIsAdult(true);
            } else if (sourceAPI === 'hentaivnx') {
                detail = await hentaivnxAPI.scrapeComicDetail(comic.url);
                setIsAdult(true);
            } else if (sourceAPI === 'sayhentai') {
                detail = await sayhentaiAPI.scrapeComicDetail(comic.url);
                setIsAdult(true);
            }
            
            setSelectedComic({
                ...comic,
                detail: detail
            });
            setCustomCoverUrl('');
            setCustomCoverFile(null);
            setProgress({ state: `Hoàn tất parse dữ liệu từ ${sourceAPI.toUpperCase()}`, percent: 100 });
        } catch (error) {
            setErrorMsg(`Lỗi lấy chi tiết truyện (${sourceAPI.toUpperCase()}): ${error.message}`);
        } finally {
            setDetailLoading(false);
        }
    };

    // Upload custom cover to Cloudinary via backend
    const handleUploadCover = async () => {
        if (!customCoverFile && !customCoverUrl) {
            alert('Vui lòng chọn File hoặc điền Link ảnh để tải lên!');
            return;
        }
        
        setUploadingCover(true);
        const formData = new FormData();
        if (customCoverFile) {
            formData.append('file', customCoverFile);
        } else if (customCoverUrl) {
            formData.append('url', customCoverUrl);
        }

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/upload-cover`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data && response.data.url) {
                // Thay luôn current coverUrl
                setSelectedComic(prev => ({
                    ...prev,
                    coverUrl: response.data.url,
                    detail: { ...prev.detail, coverUrl: response.data.url }
                }));
                alert('Tải ảnh bìa tuỳ chỉnh lên Cloudinary thành công!');
                setCustomCoverFile(null);
                setCustomCoverUrl('');
            }
        } catch (error) {
            alert('Lỗi tải ảnh Cloudinary: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploadingCover(false);
        }
    };

    // Khi admin click "Import vào DB"
    const handleImportToDB = async () => {
        if (!selectedComic || !selectedComic.detail) return;
        
        setErrorMsg('');
        try {
            const detail = selectedComic.detail;
            
            let targetChapters = [];
            if (importMode === 'manual') {
                targetChapters = detail.chapters.filter((_, idx) => selectedChapterIdxs.includes(idx));
            } else if (importMode === 'custom') {
                targetChapters = detail.chapters.filter(ch => ch.chapterNumber >= customRange.start && ch.chapterNumber <= customRange.end);
            } else {
                const limit = Number(importMode);
                if (limit > 0) {
                    targetChapters = detail.chapters.slice(0, limit);
                } else {
                    targetChapters = detail.chapters;
                }
            }
            
            const totalChapters = targetChapters.length;
            
            if (totalChapters === 0) {
                setErrorMsg('Không có chapter nào thoả mãn trong khoảng đã chọn (hoặc chưa tick chọn)!');
                setProgress({ state: '', percent: 0 });
                return;
            }

            setProgress({ state: 'Đang tải danh sách tài nguyên chương...', percent: 5 });

            // Prepare payload
            const importPayload = {
                title: detail.title,
                coverUrl: detail.coverUrl,
                description: detail.description,
                author: detail.author,
                isAdult: isAdult,
                categoryIds: selectedCategoryIds,
                tagIds: selectedTagIds,
                chapters: []
            };

            let currentCh = 0;
            for (let ch of targetChapters) {
                currentCh++;
                setProgress({ state: `Đang xử lý ảnh chương ${ch.chapterNumber} (${currentCh}/${totalChapters})...`, percent: Math.round((currentCh/totalChapters)*50) + 5 });
                
                const originalIdx = detail.chapters.indexOf(ch);
                const finalChapterNumber = customChapterNumbers[originalIdx] !== undefined ? customChapterNumbers[originalIdx] : ch.chapterNumber;
                
                let imageUrls;
                if (sourceAPI === 'otruyen') imageUrls = await scrapeChapterImages(ch.url);
                else if (sourceAPI === 'mangadex') imageUrls = await mangaDexAPI.scrapeChapterImages(ch.url);
                else if (sourceAPI === 'damconuong') imageUrls = await damconuongAPI.scrapeChapterImages(ch.url);
                else if (sourceAPI === 'hentaivnx') imageUrls = await hentaivnxAPI.scrapeChapterImages(ch.url);
                else if (sourceAPI === 'sayhentai') imageUrls = await sayhentaiAPI.scrapeChapterImages(ch.url);
                
                importPayload.chapters.push({
                    chapterNumber: finalChapterNumber,
                    title: ch.title,
                    imageUrls: imageUrls
                });
            }
            
            if (importMode === 'manual') {
                importPayload.description += `\n[GHI CHÚ: Admin đã import thủ công ${totalChapters} chapter tuyển chọn.]`;
            } else if (importMode !== '0' && importMode !== 'custom') {
                importPayload.description += `\n[GHI CHÚ: Chỉ import ${totalChapters} chapter demo do cài đặt hệ thống Admin]`;
            } else if (importMode === 'custom') {
                importPayload.description += `\n[GHI CHÚ: Đã cấu hình Admin import từ chương ${customRange.start} đến ${customRange.end}]`;
            }

            setProgress({ state: 'Đang truyền dẫn dữ liệu lên Máy Chủ Cốt Lõi...', percent: 80 });

            // Send to backend
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/import-comic`, importPayload);
            
            if (response.data.success) {
                setProgress({ state: `Đồng bộ hoàn tất! ID: ${response.data.comicId}`, percent: 100 });
                setTimeout(() => {
                    setSelectedComic(null);
                    setProgress({ state: '', percent: 0 });
                    alert("Import dữ liệu thành công vũ trụ truyện: " + detail.title);
                }, 1000);
            } else {
                setErrorMsg('Import thất bại: ' + response.data.message);
                setProgress({ state: 'Lỗi đồng bộ', percent: 0 });
            }

        } catch (error) {
            const serverMsg = error.response?.data?.message || error.message;
            setErrorMsg('Lỗi quá trình import: ' + serverMsg);
            setProgress({ state: 'Tiến trình bị gián đoạn', percent: 0 });
        }
    };


    return (
        <div className="admin-custom-container">
            {/* Header */}
            <div className="admin-glass-card p-4 mb-4 d-flex justify-content-between align-items-center animate-fade-in" style={{animationDelay: "0.1s"}}>
                <div className="d-flex align-items-center gap-3">
                    <div className="p-3 rounded-circle bg-dark border border-secondary shadow-lg">
                        <DatabaseZap size={28} className="text-info" />
                    </div>
                    <div>
                        <h3 className="mb-0 admin-gradient-text">TRUNG TÂM ĐIỀU KHIỂN HỆ THỐNG</h3>
                        <small className="text-secondary" style={{letterSpacing: "1px", textTransform: "uppercase"}}>
                            WebComic Data Ingestion Node
                        </small>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-outline-danger px-4 py-2 fw-semibold rounded-pill d-flex align-items-center gap-2 transition" onClick={handleLogout}>
                        <LogOut size={16} />
                        Ngắt Kết Nối
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="alert alert-danger d-flex align-items-center gap-3 admin-glass-card border-danger mb-4 py-3 animate-fade-in" style={{animationDelay: "0.2s", color: 'var(--text-primary)'}}>
                    <AlertTriangle size={24} className="text-danger" />
                    <span className="fw-semibold">{errorMsg}</span>
                </div>
            )}

            {/* Main Area */}
            <div className="row g-4">
                
                <div className="col-lg-6 animate-fade-in" style={{animationDelay: "0.3s"}}>
                    {/* Comic List */}
                    <div className="admin-glass-card p-4 h-100 position-relative">
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 gap-3 border-bottom border-secondary border-opacity-25">
                            <h5 className="mb-0 d-flex align-items-center gap-2 fw-bold text-nowrap" style={{color: 'var(--text-primary)'}}>
                                <LayoutGrid size={22} className="text-info"/> 
                                Kho Dữ Liệu Nguồn Cấp
                            </h5>
                            
                            {/* Source Toggle */}
                            <div className="btn-group border border-secondary border-opacity-50 p-1 rounded-pill shadow-sm" role="group" style={{backgroundColor: 'var(--bg-secondary)'}}>
                                <input type="radio" className="btn-check" name="sourceAPI" id="btnOtruyen" autoComplete="off" 
                                    checked={sourceAPI === 'otruyen'} 
                                    onChange={() => { setSourceAPI('otruyen'); setScrapedList([]); setSearchQuery(''); }} />
                                <label className={`btn rounded-pill px-3 py-1 m-0 fw-semibold d-flex align-items-center gap-2 text-nowrap ${sourceAPI === 'otruyen' ? 'btn-info text-dark shadow' : 'btn-outline-secondary border-0 opacity-50'}`} htmlFor="btnOtruyen" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                    🇻🇳 Otruyen
                                </label>

                                <input type="radio" className="btn-check" name="sourceAPI" id="btnMangadex" autoComplete="off" 
                                    checked={sourceAPI === 'mangadex'} 
                                    onChange={() => { setSourceAPI('mangadex'); setScrapedList([]); setSearchQuery(''); }} />
                                <label className={`btn rounded-pill px-3 py-1 m-0 fw-semibold d-flex align-items-center gap-2 text-nowrap ${sourceAPI === 'mangadex' ? 'btn-danger text-light shadow' : 'btn-outline-secondary border-0 opacity-50'}`} htmlFor="btnMangadex" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                    <Globe size={14}/> MangaDex
                                </label>

                                <input type="radio" className="btn-check" name="sourceAPI" id="btnDamconuong" autoComplete="off" 
                                    checked={sourceAPI === 'damconuong'} 
                                    onChange={() => { setSourceAPI('damconuong'); setScrapedList([]); setSearchQuery(''); }} />
                                <label className={`btn rounded-pill px-3 py-1 m-0 fw-semibold d-flex align-items-center gap-2 text-nowrap ${sourceAPI === 'damconuong' ? 'btn-warning text-dark shadow' : 'btn-outline-secondary border-0 opacity-50'}`} htmlFor="btnDamconuong" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                    🔞 Dâm Cô Nương
                                </label>

                                <input type="radio" className="btn-check" name="sourceAPI" id="btnHentaivnx" autoComplete="off" 
                                    checked={sourceAPI === 'hentaivnx'} 
                                    onChange={() => { setSourceAPI('hentaivnx'); setScrapedList([]); setSearchQuery(''); }} />
                                <label className={`btn rounded-pill px-3 py-1 m-0 fw-semibold d-flex align-items-center gap-2 text-nowrap ${sourceAPI === 'hentaivnx' ? 'btn-danger text-light shadow' : 'btn-outline-secondary border-0 opacity-50'}`} htmlFor="btnHentaivnx" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                    🔥 HentaiVNX
                                </label>

                                <input type="radio" className="btn-check" name="sourceAPI" id="btnSayhentai" autoComplete="off" 
                                    checked={sourceAPI === 'sayhentai'} 
                                    onChange={() => { setSourceAPI('sayhentai'); setScrapedList([]); setSearchQuery(''); }} />
                                <label className={`btn rounded-pill px-3 py-1 m-0 fw-semibold d-flex align-items-center gap-2 text-nowrap ${sourceAPI === 'sayhentai' ? 'btn-danger text-light shadow' : 'btn-outline-secondary border-0 opacity-50'}`} htmlFor="btnSayhentai" style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                    🍇 SayHentai
                                </label>
                            </div>

                            <button className="admin-btn-refresh px-4 py-2 d-flex align-items-center gap-2 text-nowrap" 
                                    onClick={handleFetchList} disabled={loadingList}>
                                <RefreshCw size={16} className={loadingList ? "fa-spin" : ""} />
                                Tải Mới
                            </button>
                        </div>
                        
                        {/* Bộ lọc Dữ Liệu */}
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-3" style={{ opacity: searchQuery.trim() ? 0.4 : 1, pointerEvents: searchQuery.trim() ? 'none' : 'auto', transition: 'all 0.3s ease' }}>
                            <button className={`btn btn-sm px-3 rounded-pill fw-bold ${!searchQuery.trim() && fetchType === 'latest' ? 'btn-primary' : 'btn-outline-secondary opacity-75'}`} style={{color: !searchQuery.trim() && fetchType === 'latest' ? '' : 'var(--text-primary)'}} onClick={() => setFetchType('latest')}>🕒 Mới Cập Nhật</button>
                            <button className={`btn btn-sm px-3 rounded-pill fw-bold ${!searchQuery.trim() && fetchType === 'hot' ? 'btn-danger' : 'btn-outline-secondary opacity-75'}`} style={{color: !searchQuery.trim() && fetchType === 'hot' ? '' : 'var(--text-primary)'}} onClick={() => setFetchType('hot')}>🔥 Đang Ra / Nổi Bật</button>
                            <button className={`btn btn-sm px-3 rounded-pill fw-bold ${!searchQuery.trim() && fetchType === 'completed' ? 'btn-success' : 'btn-outline-secondary opacity-75'}`} style={{color: !searchQuery.trim() && fetchType === 'completed' ? '' : 'var(--text-primary)'}} onClick={() => setFetchType('completed')}>✅ Khép Kín (Hoàn Thành)</button>
                            {searchQuery.trim() && <span className="text-warning small ms-2 fw-semibold animate-fade-in text-nowrap">⚠️ Đã vô hiệu hóa do đang Tìm kiếm</span>}
                        </div>

                        {/* Thanh Tìm Kiếm */}
                        <form onSubmit={handleSearch} className="d-flex w-100 mb-4 gap-2">
                            <input 
                                type="text" 
                                className="form-control border-secondary px-3 py-2" 
                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                placeholder="🔍 Gõ tên truyện để tìm kiếm (vd: Đấu La Đại Lục, One Piece)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm" disabled={loadingList}>
                                <Search size={18} />
                                <span className="fw-semibold text-nowrap">Tra Cứu</span>
                            </button>
                        </form>

                        {loadingList ? (
                            <div className="text-center py-5 my-5">
                                <div className="spinner-grow text-info mb-3" role="status" style={{width: '3rem', height: '3rem'}}></div>
                                <h5 className="text-info fw-bold">Đồng bộ Tín Hiệu...</h5>
                                <div className="text-secondary small">Hệ thống đang rà soát dữ liệu qua API Trọng Cốt...</div>
                            </div>
                        ) : (
                            <div className="row g-4 custom-scroll" style={{maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px'}}>
                                {scrapedList.map((comic, idx) => (
                                    <div key={idx} className="col-md-6 col-lg-4" style={{animation: `fadeIn 0.4s ease forwards ${Math.min(idx * 0.05, 1)}s`, opacity:0}}>
                                        <div 
                                            className="admin-comic-card d-flex flex-column h-100" 
                                            onClick={() => handlePreviewComic(comic)}
                                        >
                                            <div className="img-wrapper w-100">
                                                <img 
                                                    src={comic.coverUrl} 
                                                    alt={comic.title} 
                                                    loading="lazy" decoding="async"
                                                    onError={(e) => { e.target.src = comic.coverUrl }} // Fallback
                                                />
                                                <div className="position-absolute bottom-0 start-0 w-100 p-2" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'}}>
                                                    <span className="badge bg-success bg-opacity-75">{comic.latestChapter}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 d-flex flex-column flex-grow-1 justify-content-between">
                                                <h6 className="text-white fw-bold lh-base text-truncate-2" style={{ fontSize: '0.95rem', height: '40px', overflow: 'hidden' }} title={comic.title}>
                                                    {comic.title}
                                                </h6>
                                                
                                                <div className="mt-2 text-center text-info small fw-bold d-flex align-items-center justify-content-center gap-1 opacity-75">
                                                    Phân tích <ChevronRight size={14}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {scrapedList.length === 0 && !loadingList && (
                                    <div className="col-12 text-center py-5">
                                        <Layers size={48} className="text-secondary opacity-50 mb-3" />
                                        <h5 style={{color: 'var(--text-primary)'}}>Không Tìm Thấy Kết Quả</h5>
                                        <p className="text-secondary">Hãy thử tìm với một từ khóa khác hoặc làm mới danh sách.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="col-lg-6 animate-fade-in" style={{animationDelay: "0.4s"}}>
                    <div className="admin-glass-card p-4 h-100 sticky-top" style={{ top: '24px' }}>
                        <h5 className="mb-4 pb-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center gap-2 fw-bold text-warning">
                            <Eye size={22} className="text-warning"/> 
                            Kiểm Duyệt Cơ Sở Dữ Liệu
                        </h5>

                        {!selectedComic ? (
                            <div className="text-center py-5 mt-4">
                                <div className="position-relative d-inline-block mb-3">
                                    <Search size={56} className="text-secondary opacity-50" />
                                    <div className="position-absolute top-0 start-100 translate-middle p-2 bg-warning border border-dark rounded-circle animate-pulse">
                                        <span className="visually-hidden">Wait</span>
                                    </div>
                                </div>
                                <h6 className="fw-bold" style={{color: 'var(--text-primary)'}}>Chưa chọn mục tiêu tải về</h6>
                                <p className="text-secondary small px-3">
                                    Bấm vào một truyện bên trái để mở khoá Panel kiểm duyệt. Tại đây bạn có thể cấu hình Category, Tags trước khi Đẩy (Push) lên Database.
                                </p>
                            </div>
                        ) : (
                            <div className="preview-content custom-scroll" style={{maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px'}}>
                                <div className="text-center mb-4 position-relative">
                                    <div className="rounded-3 overflow-hidden d-inline-block border border-secondary shadow position-relative" style={{ width: '180px' }}>
                                        <img 
                                            src={selectedComic.coverUrl} 
                                            alt={selectedComic.title} 
                                            className="img-fluid"
                                            loading="lazy" decoding="async"
                                            onError={(e) => { e.target.src = selectedComic.coverUrl }}
                                        />
                                        <div className="position-absolute top-0 start-0 w-100 h-100 shadow-inner" style={{boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'}}></div>
                                    </div>
                                    <h5 className="mt-3 fw-bold admin-gradient-text lh-base">{selectedComic.title}</h5>
                                </div>

                                {/* Custom Cover Cloudinary Uploader */}
                                <div className="bg-dark bg-opacity-50 p-3 rounded-3 mb-4 border border-warning border-opacity-50">
                                    <h6 className="mb-2 fw-bold text-warning d-flex align-items-center gap-2" style={{fontSize: '0.9rem'}}>
                                        <DownloadCloud size={16}/> Đổi Bìa Truyện (Cloudinary)
                                    </h6>
                                    <div className="d-flex flex-column gap-2 mb-2">
                                        <input 
                                            type="url" 
                                            className="form-control form-control-sm border-secondary" 
                                            style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                            placeholder="Paste URL ảnh (tuỳ chọn) ..." 
                                            value={customCoverUrl}
                                            onChange={(e) => { setCustomCoverUrl(e.target.value); setCustomCoverFile(null); }}
                                        />
                                        <div className="text-secondary text-center small fw-bold">HOẶC</div>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="form-control form-control-sm border-secondary" 
                                            style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                            onChange={(e) => { setCustomCoverFile(e.target.files[0]); setCustomCoverUrl(''); }}
                                        />
                                    </div>
                                    <button 
                                        className="btn btn-warning btn-sm w-100 fw-bold" 
                                        onClick={handleUploadCover}
                                        disabled={uploadingCover || (!customCoverFile && !customCoverUrl)}
                                    >
                                        {uploadingCover ? 'Đang Tải Lên...' : 'Tải Lên Máy Chủ Cloudinary'}
                                    </button>
                                </div>

                                {detailLoading ? (
                                    <div className="text-center py-5 bg-dark bg-opacity-50 rounded-3">
                                        <div className="spinner-border text-info mb-3" role="status"></div>
                                        <div className="text-info fw-semibold text-uppercase" style={{letterSpacing: '2px', fontSize: '12px'}}>Đang Khớp Dữ Liệu...</div>
                                    </div>
                                ) : selectedComic.detail ? (
                                    <div className="comic-detail-info animate-fade-in">
                                        
                                        <div className="bg-dark bg-opacity-50 p-3 rounded-3 mb-4">
                                            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                                                <span className="text-secondary small fw-bold text-uppercase">Tác giả gốc</span>
                                                <span className="fw-semibold text-end" style={{color: 'var(--text-primary)'}}>{selectedComic.detail.author}</span>
                                            </div>
                                            <div className="mt-3">
                                                <span className="text-secondary small fw-bold text-uppercase d-block mb-2">Truyền Thuyết</span>
                                                <p className="small lh-lg m-0 custom-scroll" style={{maxHeight: '120px', overflowY: 'auto', color: 'var(--text-primary)'}}>
                                                    {selectedComic.detail.description}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Configuration DB Fields */}
                                        <div className="bg-dark bg-opacity-25 p-3 rounded-3 mb-4 border border-info border-opacity-25">
                                            <h6 className="mb-3 fw-bold text-info border-bottom border-secondary border-opacity-50 pb-2 d-flex align-items-center gap-2">
                                                <DatabaseZap size={16} /> Cấu Hình Siêu Dữ Liệu
                                            </h6>
                                            
                                            <div className="mb-3">
                                                <label className="form-label small text-secondary fw-bold text-uppercase mb-2">Danh mục gốc (Categories)</label>
                                                <div className="custom-scroll border border-secondary border-opacity-25 rounded p-2 bg-dark bg-opacity-50" style={{maxHeight: '130px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                                    {dbCategories.map(cat => (
                                                        <div key={cat.id} className="form-check form-check-inline m-0">
                                                            <input className="form-check-input mt-1 border-secondary" type="checkbox" id={`cat_${cat.id}`} 
                                                                checked={selectedCategoryIds.includes(cat.id)}
                                                                style={{backgroundColor: selectedCategoryIds.includes(cat.id) ? '#0dcaf0' : 'rgba(255,255,255,0.1)'}}
                                                                onChange={(e) => {
                                                                    if(e.target.checked) setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                                                                    else setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                                                                }}
                                                            />
                                                            <label className="form-check-label" htmlFor={`cat_${cat.id}`} style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                                                {cat.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {dbCategories.length === 0 && <small className="text-muted">Không có Category nào trong DB.</small>}
                                                </div>
                                            </div>
                                            
                                            <div className="mb-3">
                                                <label className="form-label small text-secondary fw-bold text-uppercase mb-2">Thẻ nhãn (Tags)</label>
                                                <div className="custom-scroll border border-secondary border-opacity-25 rounded p-2 bg-dark bg-opacity-50" style={{maxHeight: '130px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                                    {dbTags.map(tag => (
                                                        <div key={tag.id} className="form-check form-check-inline m-0">
                                                            <input className="form-check-input mt-1 border-secondary" type="checkbox" id={`tag_${tag.id}`} 
                                                                checked={selectedTagIds.includes(tag.id)}
                                                                style={{backgroundColor: selectedTagIds.includes(tag.id) ? '#0dcaf0' : 'rgba(255,255,255,0.1)'}}
                                                                onChange={(e) => {
                                                                    if(e.target.checked) setSelectedTagIds([...selectedTagIds, tag.id]);
                                                                    else setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                                                                }}
                                                            />
                                                            <label className="form-check-label" htmlFor={`tag_${tag.id}`} style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                                                                {tag.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {dbTags.length === 0 && <small className="text-muted">Không có Tag nào trong DB.</small>}
                                                </div>
                                            </div>
                                            
                                            <div className="form-check form-switch mt-3 d-flex align-items-center mb-1">
                                                <input className="form-check-input mt-0 fs-5 border-secondary" type="checkbox" id="adultSwitch"
                                                    checked={isAdult}
                                                    style={{backgroundColor: isAdult ? '#ffc107' : 'rgba(255,255,255,0.1)'}}
                                                    onChange={(e) => setIsAdult(e.target.checked)}
                                                />
                                                <label className="form-check-label ms-2 text-warning fw-bold text-uppercase" style={{fontSize: '0.9rem'}} htmlFor="adultSwitch">
                                                    Đánh dấu nội dung 18+ (Adult)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="d-flex flex-column mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h6 className="mb-0 fw-bold text-info">Bước Import</h6>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-info text-dark rounded-pill fw-bold px-2 py-1">
                                                        Tổng Manga: {selectedComic.detail.chapters.length} Chap
                                                    </span>
                                                    <select 
                                                        className="form-select form-select-sm border-secondary fw-semibold shadow-sm" 
                                                        style={{width: 'auto', outline: 'none', boxShadow: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                        value={importMode}
                                                        onChange={(e) => setImportMode(e.target.value)}
                                                    >
                                                        <option value="5">Lấy 5 chương đầu</option>
                                                        <option value="10">Lấy 10 chương đầu</option>
                                                        <option value="20">Lấy 20 chương đầu</option>
                                                        <option value="50">Lấy 50 chương đầu</option>
                                                        <option value="0">Lấy toàn bộ (Nặng)</option>
                                                        <option value="custom">Tuỳ chỉnh khoảng Chap</option>
                                                        <option value="manual">Chọn thủ công từng Chap</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {importMode === 'custom' && (
                                                <div className="d-flex align-items-center gap-2 mt-2 bg-dark bg-opacity-50 p-2 rounded border border-secondary border-opacity-50">
                                                    <span className="text-secondary small fw-bold">Từ Chap:</span>
                                                    <input 
                                                        type="number" 
                                                        className="form-control form-control-sm border-secondary text-center"
                                                        style={{width: '70px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                        min={1}
                                                        value={customRange.start}
                                                        onChange={(e) => setCustomRange({...customRange, start: Number(e.target.value)})}
                                                    />
                                                    <span className="text-secondary small fw-bold">Đến Chap:</span>
                                                    <input 
                                                        type="number" 
                                                        className="form-control form-control-sm border-secondary text-center"
                                                        style={{width: '70px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                        min={customRange.start}
                                                        value={customRange.end}
                                                        onChange={(e) => setCustomRange({...customRange, end: Number(e.target.value)})}
                                                    />
                                                </div>
                                            )}
                                            {importMode === 'manual' && (
                                                <div className="mt-2 bg-dark bg-opacity-50 p-2 rounded border border-secondary border-opacity-50">
                                                    <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                                                        <span className="text-info small fw-bold">Thao tác nhanh:</span>
                                                        <div className="d-flex gap-2">
                                                            <button 
                                                                className="btn btn-sm btn-outline-info py-0 px-2" 
                                                                style={{fontSize: '0.75rem'}}
                                                                onClick={() => setSelectedChapterIdxs(selectedComic.detail.chapters.map((_, i) => i))}
                                                            >
                                                                Tích Chọn Tất Cả
                                                            </button>
                                                            <button 
                                                                className="btn btn-sm btn-outline-secondary py-0 px-2" 
                                                                style={{fontSize: '0.75rem'}}
                                                                onClick={() => setSelectedChapterIdxs([])}
                                                            >
                                                                Bỏ Chọn Tất Cả
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="custom-scroll" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                        <div className="d-flex flex-wrap gap-2">
                                                            {[...selectedComic.detail.chapters].reverse().map((ch, reversedIdx) => {
                                                                const originalIdx = selectedComic.detail.chapters.length - 1 - reversedIdx;
                                                                return (
                                                                <div key={originalIdx} className="form-check m-0 bg-dark rounded px-2 py-1 border border-secondary border-opacity-25 d-flex align-items-center gap-2" style={{width: 'calc(50% - 0.25rem)'}}>
                                                                    <input 
                                                                        className="form-check-input m-0 border-secondary flex-shrink-0" 
                                                                        type="checkbox" 
                                                                        id={`man_ch_${originalIdx}`}
                                                                        checked={selectedChapterIdxs.includes(originalIdx)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) setSelectedChapterIdxs([...selectedChapterIdxs, originalIdx]);
                                                                            else setSelectedChapterIdxs(selectedChapterIdxs.filter(i => i !== originalIdx));
                                                                        }}
                                                                        style={{backgroundColor: selectedChapterIdxs.includes(originalIdx) ? '#0dcaf0' : 'rgba(255,255,255,0.1)'}}
                                                                    />
                                                                    <label className="form-check-label flex-grow-1 text-truncate" htmlFor={`man_ch_${originalIdx}`} style={{fontSize: '0.8rem', cursor: 'pointer', maxWidth: '60px', color: 'var(--text-primary)'}} title={ch.title}>
                                                                        {ch.title}
                                                                    </label>
                                                                    <div className="input-group input-group-sm ms-auto" style={{width: '55px', flexShrink: 0}}>
                                                                        <input 
                                                                            type="number" 
                                                                            step="0.1"
                                                                            className="form-control text-info border-info text-center px-0 py-0" 
                                                                            style={{fontSize: '0.75rem', height: '22px', backgroundColor: 'var(--bg-secondary)'}}
                                                                            value={customChapterNumbers[originalIdx] !== undefined ? customChapterNumbers[originalIdx] : ch.chapterNumber}
                                                                            onChange={(e) => setCustomChapterNumbers({...customChapterNumbers, [originalIdx]: Number(e.target.value)})}
                                                                            title="Sửa số thứ tự Chapter này"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Import button and Progress */}
                                        <div className="mt-4 pt-4 border-top border-secondary border-opacity-25 position-relative">
                                            {progress.state && (
                                                <div className="mb-4 bg-dark bg-opacity-50 p-3 rounded-3 border border-secondary border-opacity-50">
                                                    <div className="small text-info mb-2 fw-semibold d-flex justify-content-between">
                                                        <span>{progress.state}</span>
                                                        <span>{progress.percent}%</span>
                                                    </div>
                                                    <div className="progress bg-secondary" style={{ height: '8px', borderRadius: '4px' }}>
                                                        <div className="progress-bar bg-info progress-bar-striped progress-bar-animated" 
                                                            role="progressbar" 
                                                            style={{ width: `${progress.percent}%`, borderRadius: '4px' }}>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <button 
                                                className="admin-btn-glow w-100 fw-bold d-flex justify-content-center align-items-center gap-2 py-3"
                                                onClick={handleImportToDB}
                                                disabled={progress.percent > 0 && progress.percent < 100}
                                            >
                                                {progress.percent === 100 ? <CheckCircle size={22} /> : <DownloadCloud size={22} />}
                                                ĐỒNG BỘ {importMode === '0' ? 'TẤT CẢ' : importMode === 'custom' ? `TỪ CHAP ${customRange.start} ĐẾN ${customRange.end}` : importMode === 'manual' ? `${selectedChapterIdxs.length} CHAP ĐÃ CHỌN` : `${importMode} CHAP ĐẦU` } VÀO DATABASE
                                            </button>
                                            
                                            <div className="mt-3 text-center">
                                                <span className="badge bg-warning text-dark text-wrap lh-base px-3 py-2 fw-semibold">
                                                    ⚠️ Chế độ An toàn: Quét số lượng lớn chapter có thể mất vài phút.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
