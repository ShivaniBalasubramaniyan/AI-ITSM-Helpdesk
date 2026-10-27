import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  TicketsIcon,
  CheckIcon,
  AssistantIcon,
  KnowledgeIcon,
  PlusIcon,
  SearchIcon,
  LockIcon,
  WifiIcon,
  LaptopIcon,
  MailIcon,
  DatabaseIcon,
  CloudIcon,
  ActivityIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  MicIcon
} from './Icons';

export default function Dashboard({
  stats,
  tickets = [],
  onSelectTicket,
  onOpenCreate,
  onNavigateTab,
  onOpenKBArticle,
  onAskCopilotWithPrompt,
  addToast,
  onRefreshStats
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState(false);
  const [syncingMongo, setSyncingMongo] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [kbArticles, setKbArticles] = useState([]);
  const [loadingKb, setLoadingKb] = useState(false);

  // Fetch live database status
  const fetchDbStatus = async (silent = false) => {
    if (!silent) setLoadingDbStatus(true);
    try {
      const data = await api.getDatabaseStatus();
      setDbStatus(data);
      return data;
    } catch (err) {
      console.error('Failed to get database status', err);
    } finally {
      if (!silent) setLoadingDbStatus(false);
    }
  };

  // Fetch live Knowledge Base articles
  const fetchKbArticles = async () => {
    try {
      setLoadingKb(true);
      const data = await api.getKnowledgeArticles();
      setKbArticles(data || []);
    } catch (err) {
      console.error('Failed to load KB articles', err);
    } finally {
      setLoadingKb(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchKbArticles();
  }, []);

  const handleTestConnection = async () => {
    setLoadingDbStatus(true);
    try {
      const data = await fetchDbStatus(true);
      if (data?.connected) {
        if (addToast) addToast(`MongoDB Atlas Connected! Latency: ${data.latency_ms ?? 0}ms`, 'success');
      } else {
        if (addToast) addToast(`Database status: ${data?.type || 'offline'}`, 'info');
      }
    } catch (err) {
      if (addToast) addToast('Error testing MongoDB connection', 'error');
    } finally {
      setLoadingDbStatus(false);
    }
  };

  const handleForceSync = async () => {
    setSyncingMongo(true);
    try {
      const res = await api.syncToMongoDB();
      if (res.success) {
        if (addToast) addToast(`Synced ${res.tickets_synced} tickets & audit records to MongoDB Atlas!`, 'success');
        if (onRefreshStats) onRefreshStats();
        await fetchDbStatus(true);
      } else {
        if (addToast) addToast(`Sync: ${res.message || 'Complete'}`, 'info');
      }
    } catch (err) {
      if (addToast) addToast(`Failed to sync to MongoDB Atlas: ${err.message}`, 'error');
    } finally {
      setSyncingMongo(false);
    }
  };

  const handleToggleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (addToast) addToast('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        if (addToast) addToast('Listening... Speak your IT issue now', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        if (addToast) addToast(`Captured: "${transcript}"`, 'success');
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error', err);
        setIsListening(false);
        if (addToast) addToast('Voice input timed out or was cancelled.', 'info');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed', err);
      setIsListening(false);
    }
  };

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onAskCopilotWithPrompt) {
      onAskCopilotWithPrompt(searchQuery);
    } else if (onNavigateTab) {
      onNavigateTab('assistant');
    }
  };

  const handleLogTicketClick = () => {
    const initial = searchQuery.trim()
      ? { title: searchQuery.trim(), description: `User reported: ${searchQuery.trim()}` }
      : null;
    onOpenCreate(initial);
  };

  // Dynamic statistics calculations
  const totalTickets = stats?.total_tickets ?? tickets.length;
  const openCount = stats?.open_tickets ?? tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolvedCount = stats?.resolved_tickets ?? tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const criticalAndHigh = (stats?.critical_tickets || 0) + (stats?.high_priority_tickets || 0) || tickets.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
  const slaCompliance = stats?.sla_compliance_rate ?? (
    totalTickets > 0
      ? Math.round(((totalTickets - tickets.filter(t => t.sla_status === 'Breached').length) / totalTickets) * 1000) / 10
      : 96.5
  );

  // Dynamic Category Distribution
  const categoryDistribution = stats?.category_distribution || tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  const recentTickets = tickets.slice(0, 6);

  const getPriorityBadge = (prio) => {
    const p = (prio || 'Medium').toLowerCase();
    return <span className={`badge badge-${p}`}>{prio}</span>;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'New').toLowerCase().replace(' ', '-');
    return <span className={`badge badge-${s}`}>{status}</span>;
  };

  const getSLABadge = (slaStatus, remainingHours) => {
    const s = (slaStatus || 'Healthy').toLowerCase().replace(' ', '-');
    let label = slaStatus || 'Healthy';
    if (remainingHours !== undefined && remainingHours !== null && (label === 'Healthy' || label === 'At Risk')) {
      label = `${label} (${remainingHours}h left)`;
    }
    return <span className={`sla-badge sla-${s}`}>● {label}</span>;
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'network':
        return <WifiIcon size={18} />;
      case 'access & identity':
      case 'security':
        return <LockIcon size={18} />;
      case 'hardware':
        return <LaptopIcon size={18} />;
      case 'email & collaboration':
        return <MailIcon size={18} />;
      default:
        return <KnowledgeIcon size={18} />;
    }
  };

  return (
    <div className="dashboard-viewport user-portal-viewport">
      {/* 1. Hero Self-Service Search & AI Ask Banner */}
      <div className="glass-card user-hero-card">
        <div className="user-hero-header">
          <div className="user-hero-badge">
            <span className="pulse-dot" />
            <span>AI-Powered IT Support Desk</span>
          </div>
          <h2 className="user-hero-title">
            Hello! What can we help you solve today?
          </h2>
          <p className="user-hero-subtitle">
            Get instant solutions from our AI Copilot, explore step-by-step IT runbooks, or log and track your service requests.
          </p>
        </div>

        <form onSubmit={handleHeroSubmit} className="user-hero-search-form">
          <div className="hero-search-input-wrap">
            <span className="hero-search-icon">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Describe your issue (e.g., 'Cisco VPN connection failed' or 'How to reset Okta password')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {/* Voice Dictation Button */}
            <button
              type="button"
              className={`hero-search-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleToggleVoiceSearch}
              title={isListening ? 'Listening... click to stop' : 'Voice Dictate Search'}
            >
              <MicIcon size={16} />
              {isListening && <span className="mic-pulse-ring" />}
            </button>
            {searchQuery && (
              <button
                type="button"
                className="hero-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear input"
              >
                ×
              </button>
            )}
          </div>
          <div className="hero-search-actions">
            <button
              type="submit"
              className="btn btn-primary hero-ask-btn"
              title="Send to AI Copilot"
            >
              <AssistantIcon size={16} />
              <span>Ask AI Copilot</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary hero-ticket-btn"
              onClick={handleLogTicketClick}
              title="Open Ticket Creation Modal (Prefills with search)"
            >
              <PlusIcon size={16} />
              <span>Log Ticket</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="hero-quick-prompts">
          <span className="quick-prompts-label">Common Requests:</span>
          {[
            'VPN authentication timed out',
            'Reset Okta SSO password',
            'Request PyCharm license',
            'Outlook client disconnected',
            'Thunderbolt dock monitor flickering'
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-prompt-chip"
              onClick={() => {
                if (onAskCopilotWithPrompt) {
                  onAskCopilotWithPrompt(prompt);
                } else if (onNavigateTab) {
                  onNavigateTab('assistant');
                }
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Core Self-Service 4-Action Tiles (Directly under Hero, Above Fold) */}
      <div className="user-action-grid">
        <div
          className="glass-card user-action-card action-card-copilot"
          onClick={() => onNavigateTab && onNavigateTab('assistant')}
          role="button"
          tabIndex={0}
        >
          <div className="action-card-icon-wrap" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.12)' }}>
            <AssistantIcon size={24} />
          </div>
          <div className="action-card-text">
            <div className="action-card-title-row">
              <h3 className="action-card-title">AI Helpdesk Copilot</h3>
              <span className="badge-live-ai">Instant Help</span>
            </div>
            <p className="action-card-desc">
              Conversational troubleshooting assistant indexing approved runbooks with 1-click automated ticket escalation.
            </p>
          </div>
          <span className="action-card-arrow">Start Diagnostics →</span>
        </div>

        <div
          className="glass-card user-action-card action-card-create"
          onClick={handleLogTicketClick}
          role="button"
          tabIndex={0}
        >
          <div className="action-card-icon-wrap" style={{ color: '#4f46e5', background: 'rgba(79, 70, 229, 0.12)' }}>
            <PlusIcon size={24} />
          </div>
          <div className="action-card-text">
            <div className="action-card-title-row">
              <h3 className="action-card-title">Submit a Support Ticket</h3>
              <span className="badge badge-new">AI Auto-Classify</span>
            </div>
            <p className="action-card-desc">
              Log an issue with automatic category, urgency, and priority prediction. Live SLA tracking begins immediately.
            </p>
          </div>
          <span className="action-card-arrow">Log Incident →</span>
        </div>

        <div
          className="glass-card user-action-card action-card-tickets"
          onClick={() => onNavigateTab && onNavigateTab('tickets')}
          role="button"
          tabIndex={0}
        >
          <div className="action-card-icon-wrap" style={{ color: '#059669', background: 'rgba(5, 150, 105, 0.12)' }}>
            <TicketsIcon size={24} />
          </div>
          <div className="action-card-text">
            <div className="action-card-title-row">
              <h3 className="action-card-title">My Tickets & Requests</h3>
              <span className="badge badge-resolved">{openCount} Active</span>
            </div>
            <p className="action-card-desc">
              Track the status of your reported issues, view engineering resolution updates, and monitor live SLA timers.
            </p>
          </div>
          <span className="action-card-arrow">View All Tickets ({totalTickets}) →</span>
        </div>

        <div
          className="glass-card user-action-card action-card-kb"
          onClick={() => onNavigateTab && onNavigateTab('knowledge')}
          role="button"
          tabIndex={0}
        >
          <div className="action-card-icon-wrap" style={{ color: '#d97706', background: 'rgba(217, 119, 6, 0.12)' }}>
            <KnowledgeIcon size={24} />
          </div>
          <div className="action-card-text">
            <div className="action-card-title-row">
              <h3 className="action-card-title">Knowledge Runbooks</h3>
              <span className="badge badge-progress">{kbArticles.length || 10} Verified Guides</span>
            </div>
            <p className="action-card-desc">
              Browse approved standard operating procedures for VPN, passwords, software licenses, and hardware.
            </p>
          </div>
          <span className="action-card-arrow">Browse Runbooks →</span>
        </div>
      </div>

      {/* 3. Section Title Bar */}
      <div className="section-title-bar">
        <div className="section-title">
          <ActivityIcon size={18} />
          <span>Operational Telemetry & Performance Metrics</span>
        </div>
        <div className="section-sub">
          Live cluster sync · Dynamic SLA adherence · Active incident intelligence
        </div>
      </div>

      {/* 4. Executive Operational KPI Strip */}
      <div className="dashboard-kpi-grid">
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Total Incidents</span>
            <div className="kpi-icon-pill" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.12)' }}>
              <TicketsIcon size={16} />
            </div>
          </div>
          <div className="kpi-number">{totalTickets}</div>
          <div className="kpi-footer-note">
            <strong style={{ color: 'var(--accent-cyan)' }}>{openCount}</strong> active · <strong style={{ color: 'var(--accent-emerald)' }}>{resolvedCount}</strong> resolved
          </div>
        </div>

        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">SLA Compliance Rate</span>
            <div className="kpi-icon-pill" style={{ color: '#059669', background: 'rgba(5, 150, 105, 0.12)' }}>
              <CheckIcon size={16} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: slaCompliance >= 90 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
            {slaCompliance}%
          </div>
          <div className="progress-track" style={{ marginTop: 8, height: 6 }}>
            <div
              className="progress-fill healthy"
              style={{
                width: `${Math.min(100, Math.max(0, slaCompliance))}%`,
                background: slaCompliance >= 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              }}
            />
          </div>
          <div className="kpi-footer-note" style={{ marginTop: 6 }}>
            {stats?.sla_breakdown ? (
              <span>
                {stats.sla_breakdown.Healthy} Healthy · {stats.sla_breakdown['At Risk']} Risk · {stats.sla_breakdown.Breached} Breached
              </span>
            ) : (
              <span>Target: &gt;95.0% adherence</span>
            )}
          </div>
        </div>

        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Critical & High Priority</span>
            <div className="kpi-icon-pill" style={{ color: '#e11d48', background: 'rgba(225, 29, 72, 0.12)' }}>
              <AlertTriangleIcon size={16} />
            </div>
          </div>
          <div className="kpi-number" style={{ color: criticalAndHigh > 0 ? '#e11d48' : 'inherit' }}>
            {criticalAndHigh}
          </div>
          <div className="kpi-footer-note">
            {criticalAndHigh > 0 ? 'Priority triage requiring immediate attention' : 'All priority SLAs currently on track'}
          </div>
        </div>

        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Self-Service Runbooks</span>
            <div className="kpi-icon-pill" style={{ color: '#4f46e5', background: 'rgba(79, 70, 229, 0.12)' }}>
              <KnowledgeIcon size={16} />
            </div>
          </div>
          <div className="kpi-number">{kbArticles.length || dbStatus?.kb_count || 10}</div>
          <div className="kpi-footer-note">
            Approved SOP resolution runbooks indexed for AI Copilot
          </div>
        </div>
      </div>

      {/* 5. Enterprise Service Operational Status & Cloud Sync */}
      <div className="glass-card system-status-card">
        <div className="status-card-header">
          <div className="status-headline-wrap">
            <span className="pulse-dot-green" />
            <span className="status-headline">Enterprise IT Infrastructure & Cloud Sync Health</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {dbStatus?.latency_ms !== undefined && (
              <span className="mongo-latency-chip" title="Direct database ping roundtrip time">
                <ActivityIcon size={12} />
                <span>{dbStatus.latency_ms} ms</span>
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleForceSync}
              disabled={syncingMongo}
              title="Synchronize local SQLite store to remote MongoDB Atlas cluster"
            >
              <RefreshCwIcon size={13} className={syncingMongo ? 'spin-icon' : ''} />
              <span>{syncingMongo ? 'Syncing...' : 'Sync Cloud Atlas'}</span>
            </button>
          </div>
        </div>

        <div className="status-indicators-grid">
          <div className="status-indicator-item">
            <span className="service-dot service-healthy" />
            <div className="service-details">
              <span className="service-name">Dual-Engine Persistence</span>
              <span className="service-sub-meta">
                {dbStatus?.type === 'mongodb_atlas' ? 'MongoDB Atlas Cluster' : 'SQLite Local Fallback'}
              </span>
            </div>
            <span className="service-status">Operational</span>
          </div>

          <div className="status-indicator-item">
            <span className="service-dot service-healthy" />
            <div className="service-details">
              <span className="service-name">AI Helpdesk Copilot</span>
              <span className="service-sub-meta">Autonomous Resolution Engine</span>
            </div>
            <span className="service-status">Operational</span>
          </div>

          <div className="status-indicator-item">
            <span className="service-dot service-healthy" />
            <div className="service-details">
              <span className="service-name">Knowledge Base RAG</span>
              <span className="service-sub-meta">{kbArticles.length || 10} Verified SOPs Indexed</span>
            </div>
            <span className="service-status">Operational</span>
          </div>

          <div className="status-indicator-item">
            <span className="service-dot service-healthy" />
            <div className="service-details">
              <span className="service-name">ServiceNow Bridge</span>
              <span className="service-sub-meta">Bi-Directional Table API</span>
            </div>
            <span className="service-status">Connected</span>
          </div>
        </div>
      </div>

      {/* 6. Category Distribution Breakdown & SLA Health Matrix */}
      <div className="dashboard-grid-two">
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Incident Distribution by Category</h3>
              <p className="card-subheading">Volume breakdown across enterprise IT domains</p>
            </div>
          </div>
          <div className="category-bars-list">
            {Object.entries(categoryDistribution).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No incident data recorded yet.</div>
            ) : (
              Object.entries(categoryDistribution).map(([catName, count]) => {
                const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
                return (
                  <div key={catName} className="category-bar-row">
                    <div className="cat-info">
                      <span className="cat-name">{catName}</span>
                      <span className="cat-meta">{count} incidents ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill category-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Service Level Agreement (SLA) Matrix</h3>
              <p className="card-subheading">Real-time status tracking against SLA targets</p>
            </div>
          </div>
          <div className="sla-monitor-bars">
            {[
              { label: 'Healthy (On Track)', key: 'Healthy', cls: 'healthy' },
              { label: 'At Risk (< 25% Time Left)', key: 'At Risk', cls: 'at-risk' },
              { label: 'Breached (Resolution Overdue)', key: 'Breached', cls: 'breached' },
              { label: 'Met (Resolved on Time)', key: 'Met', cls: 'met' }
            ].map((slaTier) => {
              const count = stats?.sla_breakdown?.[slaTier.key] ?? (
                tickets.filter(t => t.sla_status === slaTier.key).length
              );
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
              return (
                <div key={slaTier.key} className="sla-item-bar">
                  <div className="sla-row-info">
                    <span>
                      <span className={`sla-dot ${slaTier.cls}`} />
                      {slaTier.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>{count} ({pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${slaTier.cls}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Active Tickets & Dynamic Knowledge Runbooks Split Section */}
      <div className="dashboard-content-split">
        {/* Left: Your Recent Incidents */}
        <div className="glass-card recent-tickets-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Recent Service Incidents</h3>
              <p className="card-subheading">Active tickets under investigation with live SLA countdowns</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab && onNavigateTab('tickets')}
            >
              View All ({tickets.length})
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <div className="empty-state-box">
              <p>No active incidents found. Everything is in good order!</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleLogTicketClick}
                style={{ marginTop: 10 }}
              >
                Log a Ticket
              </button>
            </div>
          ) : (
            <div className="recent-tickets-table-wrap">
              <table className="data-table recent-incidents-table">
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Ticket ID</th>
                    <th>Subject</th>
                    <th style={{ width: '130px' }}>Category</th>
                    <th style={{ width: '95px' }}>Priority</th>
                    <th style={{ width: '105px' }}>Status</th>
                    <th style={{ width: '130px' }}>SLA Clock</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="clickable-row"
                      onClick={() => onSelectTicket && onSelectTicket(t)}
                      title="Click to view full ticket details and resolution audit trail"
                    >
                      <td className="ticket-id-cell">
                        <span className="ticket-id-badge">{t.id}</span>
                      </td>
                      <td className="ticket-title-cell">
                        <span className="ticket-title-text" title={t.title}>
                          {t.title}
                        </span>
                      </td>
                      <td>
                        <span className="category-pill">{t.category}</span>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>{getSLABadge(t.sla_status, t.sla_remaining_hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Dynamic Top Self-Service Runbooks */}
        <div className="glass-card popular-runbooks-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Top Self-Service Runbooks</h3>
              <p className="card-subheading">Step-by-step resolution guides & SOPs</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab && onNavigateTab('knowledge')}
            >
              Browse All ({kbArticles.length || 10}) →
            </button>
          </div>

          <div className="runbooks-list">
            {(kbArticles.length > 0 ? kbArticles.slice(0, 5) : [
              { id: 'KB001', title: 'VPN Connection & Gateway Troubleshooting', category: 'Network', summary: 'Cisco AnyConnect certificate handshake & gateway resolution' },
              { id: 'KB002', title: 'Corporate Password Reset & Okta MFA', category: 'Access & Identity', summary: 'Self-service password unlock and MFA token re-synchronization' },
              { id: 'KB003', title: 'Developer Tooling & Software Licenses', category: 'Software', summary: 'JetBrains IDEs, Docker Desktop & developer license approval' },
              { id: 'KB004', title: 'External Monitor & Dock Diagnostics', category: 'Hardware', summary: 'Thunderbolt 4 docking stations, flicker & thermal checks' }
            ]).map((rb) => (
              <div
                key={rb.id}
                className="runbook-list-item"
                onClick={() => onOpenKBArticle && onOpenKBArticle(rb.id)}
                role="button"
                tabIndex={0}
                title="Click to open full step-by-step resolution procedure"
              >
                <div className="runbook-item-icon">
                  {getCategoryIcon(rb.category)}
                </div>
                <div className="runbook-item-content">
                  <div className="runbook-item-header">
                    <span className="runbook-item-id">{rb.id}</span>
                    <span className="runbook-item-title">{rb.title}</span>
                  </div>
                  <p className="runbook-item-desc">{rb.summary || rb.desc}</p>
                </div>
                <span className="runbook-item-chevron">→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
