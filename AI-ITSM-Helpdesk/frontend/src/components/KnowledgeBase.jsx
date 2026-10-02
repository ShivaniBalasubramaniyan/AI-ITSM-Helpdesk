import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  KnowledgeIcon,
  SearchIcon,
  CheckIcon,
  CloseIcon
} from './Icons';

export default function KnowledgeBase({ selectedArticleId, onCloseDetail, addToast }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [activeArticle, setActiveArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const categories = [
    'All',
    'Network',
    'Access & Identity',
    'Software',
    'Hardware',
    'Email & Collaboration'
  ];

  useEffect(() => {
    loadArticles();
  }, [category, search]);

  useEffect(() => {
    if (selectedArticleId) {
      loadArticleDetail(selectedArticleId);
    }
  }, [selectedArticleId]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeArticles(
        category === 'All' ? null : category,
        search ? search : null
      );
      setArticles(data);
    } catch (err) {
      if (addToast) addToast(`Error loading knowledge articles: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadArticleDetail = async (id) => {
    try {
      setLoadingArticle(true);
      const data = await api.getKnowledgeArticle(id);
      setActiveArticle(data);
    } catch (err) {
      if (addToast) addToast(`Error loading article ${id}: ${err.message}`, 'error');
    } finally {
      setLoadingArticle(false);
    }
  };

  const handleFeedback = async (articleId, helpful) => {
    if (feedbackGiven[articleId]) return;
    try {
      await api.submitKBFeedback(articleId, helpful);
      setFeedbackGiven((prev) => ({ ...prev, [articleId]: helpful ? 'helpful' : 'not_helpful' }));
      if (addToast) addToast('Thank you for verifying this runbook!', 'success');
      if (activeArticle && activeArticle.id === articleId) {
        setActiveArticle((prev) => ({
          ...prev,
          helpful_count: helpful ? prev.helpful_count + 1 : prev.helpful_count,
          not_helpful_count: !helpful ? prev.not_helpful_count + 1 : prev.not_helpful_count
        }));
      }
      loadArticles();
    } catch (err) {
      if (addToast) addToast(`Feedback error: ${err.message}`, 'error');
    }
  };

  return (
    <div className="kb-viewport">
      {/* Search & Filter Header Bar */}
      <div className="glass-card kb-toolbar-card">
        <div className="kb-search-row">
          <div className="kb-search-box">
            <SearchIcon size={16} className="filter-search-icon" />
            <input
              type="text"
              className="form-input search-input-padded"
              placeholder="Search verified runbooks, error codes, procedures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="kb-category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`kb-pill-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Base Content: Either In-Page Article Reader Card or Articles Grid */}
      {activeArticle ? (
        <div className="glass-card kb-reader-card">
          <div className="modal-header kb-reader-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setActiveArticle(null);
                  if (onCloseDetail) onCloseDetail();
                }}
              >
                ← Back to Runbooks
              </button>
              <span className="kb-doc-id" style={{ fontSize: '0.85rem' }}>{activeArticle.id}</span>
              <span className="badge badge-medium">{activeArticle.category}</span>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => {
                setActiveArticle(null);
                if (onCloseDetail) onCloseDetail();
              }}
              title="Close Runbook"
              aria-label="Close Runbook"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {loadingArticle ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading runbook...
            </div>
          ) : (
            <div>
              <h2 className="kb-reader-title">{activeArticle.title}</h2>

              <div className="kb-reader-meta">
                Last revised: {activeArticle.updated} • Approved Enterprise Standard Operating Procedure
              </div>

              {/* Content Area */}
              <div className="kb-reader-body">
                {activeArticle.content}
              </div>

              {/* Feedback Section */}
              <div className="kb-feedback-box">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    Was this runbook helpful for your incident resolution?
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    Verified by IT operations team ({activeArticle.helpful_count} helpful, {activeArticle.not_helpful_count} unhelpful)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-secondary btn-sm ${feedbackGiven[activeArticle.id] === 'helpful' ? 'btn-active-good' : ''}`}
                    onClick={() => handleFeedback(activeArticle.id, true)}
                    disabled={!!feedbackGiven[activeArticle.id]}
                  >
                    <CheckIcon size={14} />
                    <span>Helpful</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary btn-sm ${feedbackGiven[activeArticle.id] === 'not_helpful' ? 'btn-active-bad' : ''}`}
                    onClick={() => handleFeedback(activeArticle.id, false)}
                    disabled={!!feedbackGiven[activeArticle.id]}
                  >
                    <CloseIcon size={14} />
                    <span>Not Helpful</span>
                  </button>
                </div>
              </div>

              {/* Related Articles */}
              {activeArticle.related_articles && activeArticle.related_articles.length > 0 && (
                <div className="kb-related-section">
                  <h4 className="kb-related-heading">Cross-Referenced Runbooks:</h4>
                  <div className="kb-related-list">
                    {activeArticle.related_articles.map((rel) => (
                      <button
                        key={rel.id}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => loadArticleDetail(rel.id)}
                      >
                        <KnowledgeIcon size={14} />
                        <span>{rel.id}: {rel.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Articles Grid */
        loading ? (
          <div className="kb-loading-state">
            <div className="loading-spinner" />
            <p>Indexing enterprise documentation runbooks...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            No approved runbooks found matching your query.
          </div>
        ) : (
          <div className="kb-articles-grid">
            {articles.map((art) => (
              <div
                key={art.id}
                className="glass-card kb-article-card"
                onClick={() => loadArticleDetail(art.id)}
                role="button"
                tabIndex={0}
              >
                <div className="kb-card-header">
                  <span className="kb-doc-id">{art.id}</span>
                  <span className="kb-doc-cat">{art.category}</span>
                </div>

                <h3 className="kb-doc-title">{art.title}</h3>

                <p className="kb-doc-summary">{art.summary}</p>

                <div className="kb-doc-footer">
                  <div className="kb-tags-row">
                    {(art.tags || []).slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="kb-tag-item">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="kb-rating-stat">
                    <span>{art.helpful_count} verified helpful</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
