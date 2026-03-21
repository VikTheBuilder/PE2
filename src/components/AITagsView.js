import React, { useState, useEffect, useCallback } from 'react';
import { FiTag, FiSearch, FiImage, FiFile, FiX } from 'react-icons/fi';
import { fileAPI } from '../services/api';
import './Storage.css';

const AITagsView = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTag, setSearchTag] = useState('');
    const [allTags, setAllTags] = useState([]);

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fileAPI.getFiles();
            setFiles(data || []);

            // Extract unique tags from all files
            const tagSet = new Set();
            (data || []).forEach(f => {
                (f.aiTags || []).forEach(t => {
                    const tag = typeof t === 'string' ? t : t.Name || String(t);
                    tagSet.add(tag);
                });
            });
            setAllTags([...tagSet].sort());
        } catch (err) {
            console.error('Failed to fetch files for AI Tags:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const getFileTags = (file) => {
        const raw = file.aiTags || [];
        return raw.map(t => (typeof t === 'string' ? t : t.Name || String(t)));
    };

    const filteredFiles = searchTag
        ? files.filter(f => getFileTags(f).some(t => t.toLowerCase().includes(searchTag.toLowerCase())))
        : files.filter(f => (f.aiTags || []).length > 0);

    const getFileIcon = (fileType) => {
        if (!fileType) return <FiFile />;
        if (fileType.startsWith('image/')) return <FiImage />;
        return <FiFile />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '—';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="aitags-page">
                <div className="aitags-header">
                    <FiTag className="aitags-icon" />
                    <div>
                        <h1>AI Vision Tags</h1>
                        <p className="aitags-subtitle">Powered by Amazon Rekognition</p>
                    </div>
                </div>
                <div className="compute-loading">
                    <div className="loading-spinner" />
                    <p>Loading tagged files…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="aitags-page">
            {/* Header */}
            <div className="aitags-header">
                <FiTag className="aitags-icon" />
                <div>
                    <h1>AI Vision Tags</h1>
                    <p className="aitags-subtitle">Powered by Amazon Rekognition</p>
                </div>
            </div>

            {/* Search */}
            <div className="aitags-search">
                <div className="aitags-search-bar">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search by tag (e.g. Mountain, Nature, Document)…"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />
                    {searchTag && (
                        <button className="aitags-clear" onClick={() => setSearchTag('')}>
                            <FiX />
                        </button>
                    )}
                </div>
            </div>

            {/* Popular Tags */}
            {allTags.length > 0 && (
                <div className="aitags-cloud">
                    <h3>All Tags</h3>
                    <div className="aitags-cloud-list">
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                className={`aitags-cloud-pill ${searchTag === tag ? 'active' : ''}`}
                                onClick={() => setSearchTag(searchTag === tag ? '' : tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            <div className="aitags-results">
                <h3>
                    {searchTag
                        ? `Files tagged "${searchTag}" (${filteredFiles.length})`
                        : `All tagged files (${filteredFiles.length})`}
                </h3>

                {filteredFiles.length === 0 ? (
                    <div className="compute-empty-state">
                        <FiTag className="empty-icon" />
                        <h3>No tagged files found</h3>
                        <p>{searchTag ? `No files match the tag "${searchTag}"` : 'Upload images to auto-detect AI tags'}</p>
                    </div>
                ) : (
                    <div className="aitags-file-grid">
                        {filteredFiles.map(file => (
                            <div key={file.id} className="aitags-file-card">
                                <div className="aitags-file-icon">
                                    {getFileIcon(file.fileType)}
                                </div>
                                <div className="aitags-file-info">
                                    <span className="aitags-file-name">{file.originalName}</span>
                                    <span className="aitags-file-size">{formatSize(file.fileSize)}</span>
                                </div>
                                <div className="aitags-file-tags">
                                    {getFileTags(file).map((tag, i) => (
                                        <span
                                            key={i}
                                            className={`ai-tag-pill ${searchTag && tag.toLowerCase().includes(searchTag.toLowerCase()) ? 'highlighted' : ''}`}
                                            onClick={() => setSearchTag(tag)}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AITagsView;
