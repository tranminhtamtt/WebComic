import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Trash2, Edit, Search, ChevronLeft, ChevronRight, AlertTriangle, Save, X, BookOpen, ListOrdered, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../style/admin.css';

const AdminComicManager = () => {
    const navigate = useNavigate();
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingComic, setEditingComic] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // Delete Confirm State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [comicToDelete, setComicToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    
    // Chapter DND Management State
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [selectedComicForChapters, setSelectedComicForChapters] = useState(null);
    const [chaptersList, setChaptersList] = useState([]);
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [savingChapters, setSavingChapters] = useState(false);

    // Fetch data
    const fetchComics = useCallback(async (currentPage = 0, query = '') => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/comics/page?page=${currentPage}&size=20&keyword=${query}`);
            setComics(res.data.content);
            setTotalPages(res.data.totalPages);
            setTotalElements(res.data.totalElements);
            setPage(currentPage);
        } catch (error) {
            console.error("Lỗi lấy danh sách truyện", error);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        if (!isAdmin) {
            navigate('/admin');
        } else {
            fetchComics(0, '');
        }
    }, [navigate, fetchComics]);

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        fetchComics(0, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        fetchComics(0, '');
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAdmin');
        navigate('/admin');
    };

    // --- DELETE LOGIC ---
    const confirmDelete = (comic) => {
        setComicToDelete(comic);
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!comicToDelete) return;
        setDeleting(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/comics/${comicToDelete.id}`);
            setShowDeleteModal(false);
            setComicToDelete(null);
            // Refresh list
            fetchComics(page, searchQuery);
        } catch (error) {
            alert('Lỗi khi xoá truyện: ' + (error.response?.data?.message || error.message));
        } finally {
            setDeleting(false);
        }
    };

    // --- EDIT LOGIC ---
    const openEditModal = (comic) => {
        setEditingComic({ ...comic }); // clone
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditingComic(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const saveEdit = async () => {
        if (!editingComic) return;
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/comics/${editingComic.id}`, editingComic);
            setShowEditModal(false);
            setEditingComic(null);
            fetchComics(page, searchQuery);
        } catch (error) {
            alert('Lỗi cập nhật truyện: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    // --- CHAPTER MANAGEMENT LOGIC ---
    const openChapterModal = async (comic) => {
        setSelectedComicForChapters(comic);
        setShowChapterModal(true);
        setLoadingChapters(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/chapters/comic/${comic.id}`);
            // Đảm bảo là mảng chuẩn, sort theo chapterNumber tăng dần 1, 2, 3...
            const sorted = res.data.sort((a, b) => a.chapterNumber - b.chapterNumber).map(ch => ({
                ...ch,
                originalChapterNumber: ch.chapterNumber,
                originalTitle: ch.title
            }));
            setChaptersList(sorted);
        } catch (error) {
            console.error("Lỗi lấy danh sách chapter", error);
            alert("Không thể tải danh sách chương!");
        } finally {
            setLoadingChapters(false);
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(chaptersList);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Cập nhật lại chapterNumber dựa theo vị trí mới, GIỮ NGUYÊN TÊN CHƯƠNG GỐC nếu có
        const updatedItems = items.map((chap, index) => {
            let newTitle = chap.title;
            // Chỉ update title nếu nó ở dạng mặc định chung chung
            if (newTitle && newTitle.match(/^Chapter \d+(\.\d+)?$/i)) {
                newTitle = `Chapter ${index + 1}`;
            }
            return {
                ...chap,
                chapterNumber: index + 1.0,
                title: newTitle
            };
        });
        
        setChaptersList(updatedItems);
    };

    const saveChapterOrders = async () => {
        if (!selectedComicForChapters || chaptersList.length === 0) return;
        setSavingChapters(true);
        try {
            const payload = chaptersList.map(ch => ({
                id: ch.id,
                chapterNumber: ch.chapterNumber,
                title: ch.title
            }));
            
            await axios.put(`${import.meta.env.VITE_API_BASE_URL}/chapters/comic/${selectedComicForChapters.id}/reorder`, payload);
            alert("Lưu thứ tự Chapter thành công!");
            setShowChapterModal(false);
            setSelectedComicForChapters(null);
            setChaptersList([]);
        } catch (error) {
            console.error(error);
            alert('Lỗi cập nhật thứ tự: ' + (error.response?.data?.message || error.message));
        } finally {
            setSavingChapters(false);
        }
    };

    return (
        <div className="admin-dashboard container-fluid py-4 min-vh-100">
            {/* Header & Navigation */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-50">
                <div className="mb-3 mb-md-0">
                    <h2 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{color: 'var(--text-primary)'}}>
                        <BookOpen size={28} className="text-primary" />
                        Kho Truyện Hệ Thống
                    </h2>
                    <p className="text-secondary mb-0">Quản lý và chỉnh sửa dữ liệu gốc ({totalElements} truyện)</p>
                </div>
                <div className="d-flex gap-3">
                    <button className="btn btn-outline-info rounded-pill px-4" onClick={() => navigate('/admin/dashboard')}>
                        Cào Dữ Liệu Nguồn
                    </button>
                    <button className="btn btn-outline-danger rounded-pill px-4" onClick={handleLogout}>
                        <LogOut size={16} className="me-2" />
                        Đăng Xuất
                    </button>
                </div>
            </div>

            {/* Toolbar (Search) */}
            <div className="admin-glass-card p-3 mb-4 rounded-4">
                <form onSubmit={handleSearch} className="d-flex gap-2 w-100" style={{ maxWidth: '500px' }}>
                    <div className="input-group">
                        <span className="input-group-text border-secondary text-secondary" style={{backgroundColor: 'var(--bg-secondary)'}}>
                            <Search size={18} />
                        </span>
                        <input 
                            type="text" 
                            className="form-control border-secondary shadow-none" 
                            style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                            placeholder="Nhập tên truyện..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button type="button" className="btn border-secondary border-start-0 text-secondary" style={{backgroundColor: 'var(--bg-secondary)'}} onClick={handleClearSearch}>
                                <X size={18} />
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={isSearching}>
                            {isSearching ? <span className="spinner-border spinner-border-sm"></span> : 'Tìm Kiếm'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Main Table */}
            <div className="admin-glass-card rounded-4 overflow-hidden shadow-lg border border-secondary border-opacity-25">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{color: 'var(--text-primary)'}}>
                        <thead className="table-active">
                            <tr>
                                <th className="text-center" style={{ width: '60px' }}>ID</th>
                                <th style={{ width: '80px' }}>Ảnh Bìa</th>
                                <th>Tên Truyện</th>
                                <th>Tác Giả</th>
                                <th className="text-center">18+</th>
                                <th className="text-center">Trạng Thái</th>
                                <th className="text-center" style={{ width: '150px' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-secondary">
                                        <div className="spinner-border text-primary mb-3" role="status"></div>
                                        <div>Đang tải kho dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : comics.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-secondary">
                                        <AlertTriangle size={48} className="mb-3 opacity-50 text-warning" />
                                        <h5>Không tìm thấy truyện nào</h5>
                                        <p>Hãy thử từ khóa khác hoặc dọn dẹp bộ lọc tìm kiếm.</p>
                                    </td>
                                </tr>
                            ) : (
                                comics.map(comic => (
                                    <tr key={comic.id}>
                                        <td className="text-center text-secondary">#{comic.id}</td>
                                        <td>
                                            <img src={comic.coverUrl} alt={comic.title} 
                                                 className="rounded shadow-sm" 
                                                 style={{ width: '45px', height: '60px', objectFit: 'cover' }} 
                                                 onError={(e) => {e.target.src = 'https://placehold.co/150x200?text=No+Cover'}}/>
                                        </td>
                                        <td>
                                            <div className="fw-bold text-truncate" style={{ maxWidth: '300px', color: 'var(--text-primary)' }}>{comic.title}</div>
                                            <div className="small text-secondary">{comic.latestChapterTitle || 'Chưa có chương'}</div>
                                        </td>
                                        <td className="text-secondary">{comic.author || 'Đang cập nhật'}</td>
                                        <td className="text-center">
                                            {comic.isAdult ? (
                                                <span className="badge bg-danger bg-opacity-25 text-danger border border-danger rounded-pill px-2">18+</span>
                                            ) : (
                                                <span className="text-secondary">-</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {comic.status === 1 ? (
                                                <span className="badge bg-success bg-opacity-25 text-success border border-success rounded-pill px-2 pb-1">Đang Ra</span>
                                            ) : comic.status === 2 ? (
                                                <span className="badge bg-info bg-opacity-25 text-info border border-info rounded-pill px-2 pb-1">Hoàn Thành</span>
                                            ) : (
                                                <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary rounded-pill px-2 pb-1">Tạm Ngưng</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <button className="btn btn-sm btn-outline-warning rounded-circle p-2" title="Quản lý Chapter" onClick={() => openChapterModal(comic)}>
                                                    <ListOrdered size={16} />
                                                </button>
                                                <button className="btn btn-sm btn-outline-info rounded-circle p-2" title="Chỉnh sửa" onClick={() => openEditModal(comic)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger rounded-circle p-2" title="Xóa" onClick={() => confirmDelete(comic)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="bg-transparent border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center py-3 px-4">
                        <div className="text-secondary small">
                            Trang {page + 1} / {totalPages}
                        </div>
                        <div className="btn-group shadow-sm">
                            <button 
                                className="btn border-secondary d-flex align-items-center"
                                style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
                                disabled={page === 0} 
                                onClick={() => fetchComics(page - 1, searchQuery)}>
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                className="btn border-secondary d-flex align-items-center"
                                style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
                                disabled={page >= totalPages - 1} 
                                onClick={() => fetchComics(page + 1, searchQuery)}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {showEditModal && editingComic && (
                <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content admin-glass-card rounded-4 shadow-lg border-secondary" style={{color: 'var(--text-primary)'}}>
                            <div className="modal-header border-bottom border-secondary border-opacity-50">
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <Edit size={20} className="text-info" /> Sửa Thông Tin Thằng "{editingComic.title}"
                                </h5>
                                <button type="button" className="btn-close" style={{filter: 'var(--close-btn-filter)'}} onClick={() => setShowEditModal(false)}></button>
                            </div>
                            
                            <div className="modal-body custom-scrollbar">
                                <div className="row g-4">
                                    <div className="col-md-4 text-center">
                                        <h6 className="text-secondary mb-3">Thực Tế Ảnh Bìa</h6>
                                        <div className="rounded-3 p-1 mx-auto" style={{ width: '180px', height: '250px', backgroundColor: 'var(--glass-border)' }}>
                                            <img src={editingComic.coverUrl} alt="Cover Preview" className="w-100 h-100 object-cover rounded" onError={(e) => {e.target.src = 'https://placehold.co/150x200?text=Error'}}/>
                                        </div>
                                        <div className="mt-4 text-start p-3 rounded-3 border border-warning border-opacity-25" style={{backgroundColor: 'var(--bg-secondary)'}}>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <AlertTriangle size={16} className="text-warning"/>
                                                <span className="text-warning fw-bold text-sm">Gắn Nhãn 18+</span>
                                            </div>
                                            <div className="form-check form-switch ms-1">
                                                <input className="form-check-input" type="checkbox" role="switch" id="switch18" 
                                                    name="isAdult"
                                                    checked={editingComic.isAdult}
                                                    onChange={handleEditChange} />
                                                <label className="form-check-label ms-2" htmlFor="switch18">Nhạy cảm</label>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="col-md-8">
                                        <div className="mb-3">
                                            <label className="form-label text-secondary text-sm">Tên Truyện</label>
                                            <input type="text" className="form-control border-secondary" 
                                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                name="title" value={editingComic.title || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary text-sm">Tác Giả</label>
                                            <input type="text" className="form-control border-secondary" 
                                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                name="author" value={editingComic.author || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary text-sm">URL Ảnh Bìa</label>
                                            <input type="text" className="form-control border-secondary" 
                                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                name="coverUrl" value={editingComic.coverUrl || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary text-sm">Trạng Thái</label>
                                            <select className="form-select border-secondary" 
                                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                name="status" value={editingComic.status} onChange={handleEditChange}>
                                                <option value={1}>Đang Ra</option>
                                                <option value={2}>Hoàn Thành</option>
                                                <option value={3}>Tạm Ngưng</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label text-secondary text-sm">Mô Tả Nội Dung</label>
                                            <textarea className="form-control border-secondary" 
                                                style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                                                rows="5" name="description" value={editingComic.description || ''} onChange={handleEditChange}></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="modal-footer border-top border-secondary border-opacity-50">
                                <button type="button" className="btn btn-outline-secondary px-4 rounded-pill" onClick={() => setShowEditModal(false)}>Hủy</button>
                                <button type="button" className="btn btn-info px-4 rounded-pill d-flex align-items-center gap-2 text-dark" onClick={saveEdit} disabled={saving}>
                                    {saving ? <span className="spinner-border spinner-border-sm"></span> : <Save size={18} />}
                                    Lưu Thay Đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDeleteModal && comicToDelete && (
                <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content admin-glass-card rounded-4 border-danger">
                            <div className="modal-body text-center p-5">
                                <div className="bg-danger bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                                    <Trash2 size={40} className="text-danger" />
                                </div>
                                <h4 className="fw-bold mb-3" style={{color: 'var(--text-primary)'}}>Xác Nhận Xóa Truyện!</h4>
                                <p className="text-secondary mb-4">Bạn sắp sửa xóa hoàn toàn <strong>"{comicToDelete.title}"</strong>. Hành động này sẽ xoá sạch MỌI dữ liệu (bình luận, chương, hình ảnh, lịch sử đọc...) của truyện này. Bạn chắc chắn chứ?</p>
                                
                                <div className="d-flex gap-3 justify-content-center">
                                    <button type="button" className="btn btn-outline-secondary px-4 rounded-pill" onClick={() => setShowDeleteModal(false)}>Hủy Lệnh</button>
                                    <button type="button" className="btn btn-danger px-4 rounded-pill" onClick={executeDelete} disabled={deleting}>
                                        {deleting ? <span className="spinner-border spinner-border-sm"></span> : 'Vâng, Xóa Vĩnh Viễn'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAPTER MANAGEMENT DND MODAL */}
            {showChapterModal && selectedComicForChapters && (
                <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content admin-glass-card rounded-4 shadow-lg border-warning border-opacity-50" style={{color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)'}}>
                            <div className="modal-header border-bottom border-warning border-opacity-25">
                                <h5 className="modal-title d-flex align-items-center gap-2 text-warning fw-bold">
                                    <ListOrdered size={22} className="text-warning" />
                                    Cấu Hình Sắp Xếp Chương
                                </h5>
                                <button type="button" className="btn-close" style={{filter: 'var(--close-btn-filter)'}} onClick={() => setShowChapterModal(false)}></button>
                            </div>
                            
                            <div className="modal-body" style={{backgroundColor: 'var(--bg-primary)'}}>
                                <div className="mb-4 text-center">
                                    <h6 className="mb-1 border-bottom border-warning d-inline-block pb-2 px-3" style={{color: 'var(--text-primary)'}}>"{selectedComicForChapters.title}"</h6>
                                    <p className="text-secondary small mt-2 mb-0">Giữ chuột và kéo thả thanh trượt để đổi thứ tự. Hệ thống tự động đẩy thứ tự (Index) từ trên xuống dưới.</p>
                                </div>

                                {loadingChapters ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-info mb-3" role="status"></div>
                                        <div className="text-secondary">Đang tải cấu trúc chương...</div>
                                    </div>
                                ) : chaptersList.length === 0 ? (
                                    <div className="text-center py-5 text-secondary">Truyện này hiện không có chương nào.</div>
                                ) : (
                                    <div className="p-2 border border-secondary border-opacity-25 rounded" style={{backgroundColor: 'var(--bg-secondary)'}}>
                                        <DragDropContext onDragEnd={handleDragEnd}>
                                            <Droppable droppableId="chapters">
                                                {(provided) => (
                                                    <div 
                                                        {...provided.droppableProps} 
                                                        ref={provided.innerRef}
                                                        className="d-flex flex-column gap-2"
                                                    >
                                                        {chaptersList.map((chap, index) => (
                                                            <Draggable key={chap.id.toString()} draggableId={chap.id.toString()} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        className={`d-flex align-items-center justify-content-between p-3 rounded border transition ${(snapshot.isDragging) ? 'bg-info bg-opacity-25 border-info shadow-lg scale-102' : (chap.chapterNumber !== chap.originalChapterNumber) ? 'bg-warning bg-opacity-10 border-warning border-opacity-75' : 'border-secondary border-opacity-50 hover-bg-light-opacity'}`}
                                                                        style={{...provided.draggableProps.style, zIndex: snapshot.isDragging ? 999 : 1, backgroundColor: snapshot.isDragging ? '' : 'var(--glass-border)'}}
                                                                    >
                                                                        <div className="d-flex align-items-center gap-3 w-100">
                                                                            <div {...provided.dragHandleProps} className="text-secondary hover-text-white cursor-grab p-2">
                                                                                <GripVertical size={20} />
                                                                            </div>
                                                                            
                                                                            <div className="d-flex align-items-center flex-grow-1">
                                                                                <div className="fw-bold text-info" style={{width: '90px'}}>
                                                                                    Index: {index + 1}
                                                                                </div>
                                                                                <div className="ms-3 d-flex flex-column" style={{color: 'var(--text-primary)'}}>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <span className="fw-bold fs-6">{chap.title}</span>
                                                                                        {chap.chapterNumber !== chap.originalChapterNumber && (
                                                                                            <span className="badge bg-warning bg-opacity-25 text-warning border border-warning px-2 rounded-pill" style={{fontSize: '0.65rem'}}>
                                                                                                Đã Đổi Vị Trí
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-secondary mt-1" style={{fontSize: '0.8rem'}}>
                                                                                        <span>Hiện Tại: Chap {chap.chapterNumber}</span>
                                                                                        <span className="ms-3 text-info opacity-75">
                                                                                            (Lúc Trích Xuất: Chap {chap.originalChapterNumber ?? 'N/A'} {chap.originalTitle && chap.originalTitle !== chap.title ? `- ${chap.originalTitle}` : ''})
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="text-secondary small ms-auto d-flex gap-3">
                                                                                <span title="View Count">👁 {chap.viewCount || 0}</span>
                                                                                <span title="ID"># {chap.id}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    </div>
                                )}
                            </div>
                            
                            <div className="modal-footer border-top border-warning border-opacity-25" style={{backgroundColor: 'var(--bg-primary)'}}>
                                <button type="button" className="btn btn-outline-secondary px-4 rounded-pill" onClick={() => setShowChapterModal(false)}>Hủy</button>
                                <button type="button" className="btn btn-warning px-4 rounded-pill d-flex align-items-center gap-2 fw-bold text-dark" onClick={saveChapterOrders} disabled={savingChapters || loadingChapters}>
                                    {savingChapters ? <span className="spinner-border spinner-border-sm"></span> : <Save size={18} />}
                                    Ghi Đè Vị Trí
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminComicManager;
