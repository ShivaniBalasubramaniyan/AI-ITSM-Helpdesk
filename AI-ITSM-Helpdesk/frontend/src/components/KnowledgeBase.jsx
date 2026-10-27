import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  KnowledgeIcon,
  SearchIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon
} from './Icons';

function CreateRunbookModal({ onClose, onCreated, addToast }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Network');
  const [tags, setTags] = useState('vpn, network, gateway');
  const [author, setAuthor] = useState('IT Knowledge Engineering');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState(`## Symptoms
- AnyConnect or GlobalProtect VPN client hangs on "Connecting to gateway..."
- Error: "VPN connection failed due to certificate validation or gateway timeout"

## Diagnostic & Triage Steps
1. **Verify Internet Connection**: Ensure public domains like google.com respond
2. **Inspect VPN Agent Status**: Check Cisco AnyConnect Secure Mobility Agent service

## Step-by-Step Resolution Procedures
1. **Flush DNS Cache**: Execute \`ipconfig /flushdns\` in Administrator Command Prompt
2. **Restart Mobility Agent**: Restart Cisco AnyConnect service in services.msc
3. **Switch Gateway**: Select secondary failover gateway from the connection dropdown

## Verification & Rollback Plan
Verify internal portal reachability and approve MFA push within 30 seconds.`);
  const [submitting, setSubmitting] = useState(false);

  const applyTemplate = (type) => {
    if (type === 'k8s') {
      setTitle('Kubernetes Pod CrashLoopBackOff & OOMKilled Diagnostics');
      setCategory('Infrastructure');
      setTags('kubernetes, pod, oom, crashloop, memory-limit');
      setSummary('SOP for resolving exit code 137 OOMKilled and CrashLoopBackOff states in Kubernetes pods.');
      setContent(`## Symptoms
- Pod enters CrashLoopBackOff state with exit code 137 (OOMKilled)
- Dependent enterprise services experience elevated latency or connection timeouts

## Diagnostic & Triage Steps
1. **Identify Failing Pods**: Run \`kubectl get pods -n production -l app=service-name\`
2. **Inspect Termination Cause**: Execute \`kubectl describe pod <pod-name> -n production | grep -E "(Exit Code|OOMKilled|Reason)"\`
3. **Review Pod Logs**: Run \`kubectl logs <pod-name> --previous --tail=100\`

## Step-by-Step Resolution Procedures
1. **Increase Memory Limits**: Update resource definitions in deployment manifest:
   \`\`\`yaml
   resources:
     requests:
       memory: "1Gi"
     limits:
       memory: "2Gi"
   \`\`\`
2. **Trigger Safe Rollout**: Execute \`kubectl rollout restart deployment <deploy-name> -n production\`
3. **Monitor Container Metrics**: Verify node stability with \`kubectl top pod <pod-name>\`

## Verification & Rollback Plan
Ensure health endpoints return HTTP 200 within 60s. If instability persists, execute \`kubectl rollout undo deployment <deploy-name>\`.`);
    } else if (type === 'access') {
      setTitle('Okta SSO Certificate Validation & SAML Handshake Failure');
      setCategory('Access & Identity');
      setTags('okta, sso, saml, mfa, authentication, identity');
      setSummary('Troubleshooting guide for corporate single sign-on SAML assertion failures and MFA token de-synchronization.');
      setContent(`## Symptoms
- Users receive HTTP 403 Forbidden or "SAML assertion signature verification failed"
- Okta Verify push notification does not arrive on enrolled mobile devices

## Diagnostic & Triage Steps
1. **Check Identity Status**: Verify user account status in Okta Admin Console (Active vs Suspended)
2. **Check Certificate Validity**: Confirm SAML X.509 Signing Certificate has not expired
3. **Time Drift Verification**: Ensure client workstation clock drift is within 30 seconds of NTP

## Step-by-Step Resolution Procedures
1. **Clear Okta Cache**: Direct user to clear browser credentials or launch in incognito session
2. **Re-sync MFA Profile**: Issue an Okta temporary bypass code and trigger MFA profile re-enrollment
3. **Renew Application Certificate**: Update certificate fingerprint in Service Provider metadata

## Verification & Rollback Plan
Test user login across staging portal before confirming resolution on production incident ticket.`);
    } else if (type === 'network') {
      setTitle('Corporate VPN Gateway Handshake & TLS Timeout');
      setCategory('Network');
      setTags('vpn, anyconnect, gateway, tls, dns, network');
      setSummary('Step-by-step resolution for AnyConnect and GlobalProtect gateway timeouts and local DNS resolution failures.');
      setContent(`## Symptoms
- Client displays "VPN connection failed due to unsuccessful certificate validation or gateway timeout"
- External internet works, but corporate intranet resources (Jira, Confluence, Jenkins) are unreachable

## Diagnostic & Triage Steps
1. **Test Gateway Reachability**: Execute \`ping vpn.corp.internal\` and \`tracert vpn.corp.internal\`
2. **Check DNS Resolver**: Run \`nslookup vpn.corp.internal\` to verify correct corporate DNS response
3. **Review AnyConnect Logs**: Check \`%TEMP%\\cisco-anyconnect.log\` for handshake errors

## Step-by-Step Resolution Procedures
1. **Restart VPN Mobility Agent**: Restart \`Cisco AnyConnect Secure Mobility Agent\` service
2. **Flush Local DNS**: Open Administrator Command Prompt and run \`ipconfig /flushdns\`
3. **Switch to Backup Gateway**: Connect to secondary tunnel endpoint \`vpn-backup.corp.internal\`

## Verification & Rollback Plan
Verify internal application reachability and ping test across default gateway IP.`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      if (addToast) addToast('Please enter both a runbook title and resolution content.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const payload = {
        title: title.trim(),
        category,
        tags: tagList,
        summary: summary.trim() || undefined,
        content: content.trim(),
        author: author.trim() || 'IT Knowledge Engineering'
      };

      const newArticle = await api.createKnowledgeArticle(payload);
      if (addToast) addToast(`Runbook ${newArticle.id} published & indexed for AI Copilot!`, 'success');
      onCreated(newArticle);
    } catch (err) {
      if (addToast) addToast(`Failed to publish runbook: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container kb-modal-container glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="action-card-icon-wrap" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', width: 34, height: 34 }}>
              <KnowledgeIcon size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>Author Standard Operating Procedure (SOP)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Publish an approved IT runbook. Indexed immediately for engineer self-service & autonomous AI Copilot.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px' }}>
          {/* Quick Template Fill Buttons */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Quick Enterprise SOP Templates:
            </span>
            <div className="template-chips-row">
              <button type="button" className="template-chip" onClick={() => applyTemplate('k8s')}>
                📋 Cloud & Kubernetes SOP
              </button>
              <button type="button" className="template-chip" onClick={() => applyTemplate('access')}>
                📋 Okta SSO & MFA SOP
              </button>
              <button type="button" className="template-chip" onClick={() => applyTemplate('network')}>
                📋 Corporate VPN Gateway SOP
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Runbook Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Kubernetes Ingress & TLS Certificate Renewal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Network">Network</option>
                <option value="Access & Identity">Access & Identity</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Email & Collaboration">Email & Collaboration</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Security">Security</option>
              </select>
            </div>

            {/* Author */}
            <div className="form-group">
              <label className="form-label">Authoring Team / Engineer</label>
              <input
                type="text"
                className="form-input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Search Tags (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., kubernetes, tls, ingress, cert-manager"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="form-group">
            <label className="form-label">Summary / Problem Synopsis</label>
            <input
              type="text"
              className="form-input"
              placeholder="Short description displayed on search results & AI card summaries"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          {/* Markdown Content */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>Step-by-Step Resolution Procedures (Markdown) *</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Supports GitHub Flavored Markdown</span>
            </div>
            <textarea
              className="form-textarea runbook-editor-textarea"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <PlusIcon size={14} />
              <span>{submitting ? 'Publishing & Indexing...' : 'Publish & Index Runbook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KnowledgeBase({ selectedArticleId, onCloseDetail, addToast }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [activeArticle, setActiveArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const categories = [
    'All',
    'Network',
    'Access & Identity',
    'Software',
    'Hardware',
    'Email & Collaboration',
    'Infrastructure',
    'Security'
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
      {/* Search, Filter & Runbook Authoring Toolbar */}
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
          <button
            type="button"
            className="btn btn-primary kb-create-btn"
            onClick={() => setIsCreateOpen(true)}
            title="Publish Standard Operating Procedure (SOP) Runbook"
          >
            <PlusIcon size={14} />
            <span>+ Create Runbook</span>
          </button>
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
              <div className="kb-reader-body" style={{ whiteSpace: 'pre-wrap' }}>
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

      {/* Runbook Authoring Modal */}
      {isCreateOpen && (
        <CreateRunbookModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newArticle) => {
            setIsCreateOpen(false);
            loadArticles();
            if (newArticle?.id) {
              loadArticleDetail(newArticle.id);
            }
          }}
          addToast={addToast}
        />
      )}
    </div>
  );
}
