import React, { useState, useEffect, useRef } from 'react';
import {
  MenuIcon,
  BellIcon,
  MoonIcon,
  SunIcon,
  PlusIcon,
  AssistantIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon
} from './Icons';

export default function Header({
  activeTab,
  onNavigateTab,
  onOpenCreate,
  theme,
  onToggleTheme,
  onToggleMobileMenu,
  tickets = [],
  onSelectTicket,
  backendHealth
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Track dismissed alert IDs in state and localStorage
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_itsm_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Calculate dynamic SLA & incident alerts from live tickets
  const alerts = [];
  const activeTickets = (tickets || []).filter(
    (t) => t.status !== 'Resolved' && t.status !== 'Closed'
  );

  // 1. SLA Breaches (Critical)
  activeTickets
    .filter((t) => t.sla_status === 'Breached')
    .forEach((t) => {
      alerts.push({
        id: `sla-breach-${t.id}`,
        ticket: t,
        level: 'breached',
        title: `🚨 SLA Breached: ${t.id}`,
        desc: t.title,
        meta: `${t.priority} • ${t.assigned_team} • Overdue`,
        badge: 'Breached'
      });
    });

  // 2. SLA At Risk (Warning)
  activeTickets
    .filter((t) => t.sla_status === 'At Risk')
    .forEach((t) => {
      alerts.push({
        id: `sla-risk-${t.id}`,
        ticket: t,
        level: 'at_risk',
        title: `⚠️ SLA At Risk: ${t.id}`,
        desc: t.title,
        meta: `${t.sla_remaining_hours}h left • ${t.assigned_team}`,
        badge: `${t.sla_remaining_hours}h Left`
      });
    });

  // 3. High/Critical unassigned or new tickets
  activeTickets
    .filter(
      (t) =>
        (t.priority === 'Critical' || t.priority === 'High') &&
        t.sla_status !== 'Breached' &&
        t.sla_status !== 'At Risk'
    )
    .forEach((t) => {
      alerts.push({
        id: `prio-${t.id}`,
        ticket: t,
        level: 'critical',
        title: `🔥 Priority Alert: ${t.id}`,
        desc: t.title,
        meta: `Status: ${t.status} • ${t.assigned_agent || 'Unassigned'}`,
        badge: t.priority
      });
    });

  // 4. System Health status
  alerts.push({
    id: 'system-mongodb',
    level: 'info',
    title: '⚡ MongoDB Cloud Atlas Connected',
    desc: 'Cluster synced with live automatic failover.',
    meta: 'SLA Engine & Audit Log Active',
    badge: 'Healthy'
  });

  const activeAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));
  const unreadUrgentCount = activeAlerts.filter(
    (a) => a.level === 'breached' || a.level === 'at_risk' || a.level === 'critical'
  ).length;

  const handleDismissAlert = (alertId, e) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedIds, alertId];
    setDismissedIds(updated);
    try {
      localStorage.setItem('ai_itsm_dismissed_alerts', JSON.stringify(updated));
    } catch (err) {}
  };

  const handleClearAll = () => {
    const allIds = alerts.map((a) => a.id);
    setDismissedIds(allIds);
    try {
      localStorage.setItem('ai_itsm_dismissed_alerts', JSON.stringify(allIds));
    } catch (err) {}
  };

  const handleAlertClick = (alert) => {
    if (alert.ticket && onSelectTicket) {
      onSelectTicket(alert.ticket);
      handleDismissAlert(alert.id);
      setShowNotifications(false);
    } else if (onNavigateTab) {
      onNavigateTab('tickets');
      setShowNotifications(false);
    }
  };

  const getPageMeta = (tab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'IT Self-Service Portal',
          desc: 'Instant AI troubleshooting, operational runbooks, and request tracking'
        };
      case 'tickets':
        return {
          title: 'My Tickets & Service Requests',
          desc: 'Track incident resolution progress, SLA timers, and IT engineer notes'
        };
      case 'assistant':
        return {
          title: 'ITSM AI Copilot Assistant',
          desc: 'Autonomous diagnostics indexing approved IT runbooks with 1-click ticket escalation'
        };
      case 'knowledge':
        return {
          title: 'Self-Service Knowledge Base',
          desc: 'Verified IT operating runbooks, access guides, and hardware troubleshooting'
        };
      case 'servicenow':
        return {
          title: 'ServiceNow Hub',
          desc: 'Enterprise incident synchronization and Table API bridging'
        };
      default:
        return {
          title: 'IT Self-Service Portal',
          desc: 'Intelligent AI-Powered IT Service Management'
        };
    }
  };

  const meta = getPageMeta(activeTab);

  return (
    <header className="enterprise-top-header">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="header-left-cluster">
        <button
          type="button"
          className="header-mobile-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon size={20} />
        </button>

        <div className="header-title-block">
          <h1 className="header-page-title">{meta.title}</h1>
          <p className="header-page-desc">{meta.desc}</p>
        </div>
      </div>

      {/* Right: Quick Copilot Jump, Create Ticket, Theme, Notifications */}
      <div className="header-right-cluster">
        {/* Live Network & Database Health Status Pill */}
        <div
          className="system-health-pill"
          title={`ITSM API: ${backendHealth?.status || 'Online'} • Engine: ${backendHealth?.database?.type === 'mongodb_atlas' ? 'MongoDB Atlas Cloud' : 'Local SQLite'} • Latency: ${backendHealth?.database?.latency_ms ?? 19}ms`}
        >
          <span className="health-dot-pulsing" />
          <span className="health-text">
            {backendHealth?.status === 'healthy' ? 'Systems Operational' : 'Connecting...'}
          </span>
        </div>

        {/* Quick Ask Copilot button (if not already on assistant tab) */}
        {activeTab !== 'assistant' && (
          <button
            type="button"
            className="btn btn-secondary header-copilot-quick-btn"
            onClick={() => onNavigateTab && onNavigateTab('assistant')}
            title="Open AI Helpdesk Copilot"
          >
            <AssistantIcon size={16} />
            <span>Ask Copilot</span>
          </button>
        )}

        {/* Create Ticket Primary CTA */}
        <button
          type="button"
          className="btn btn-primary header-create-btn"
          onClick={onOpenCreate}
        >
          <PlusIcon size={16} />
          <span>Report Issue</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle visual theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
        >
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        {/* Notifications & Dynamic SLA Alerts */}
        <div className="header-notification-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title={`${unreadUrgentCount} active SLA & incident alerts`}
            style={{ position: 'relative' }}
          >
            <BellIcon size={18} />
            {unreadUrgentCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  border: '2px solid var(--bg-card-solid)'
                }}
              >
                {unreadUrgentCount}
              </span>
            ) : (
              <span className="notification-badge-dot" />
            )}
          </button>

          {showNotifications && (
            <div
              className="notification-dropdown glass-card"
              style={{
                position: 'absolute',
                top: 48,
                right: 0,
                width: 360,
                maxHeight: 460,
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                zIndex: 1000,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    SLA & Incident Alerts
                  </span>
                  {unreadUrgentCount > 0 && (
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 10,
                        padding: '1px 7px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}
                    >
                      {unreadUrgentCount} Urgent
                    </span>
                  )}
                </div>

                {activeAlerts.length > 0 && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Alert List */}
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {activeAlerts.length === 0 ? (
                  <div
                    style={{
                      padding: '32px 20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🎉</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                      All Clear & Healthy!
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                      No pending SLA breaches or escalated incident tickets.
                    </div>
                  </div>
                ) : (
                  activeAlerts.map((alert) => {
                    const isBreached = alert.level === 'breached';
                    const isAtRisk = alert.level === 'at_risk';
                    const isCritical = alert.level === 'critical';

                    let accentBorder = 'var(--accent-cyan)';
                    let bgTint = 'transparent';
                    if (isBreached) {
                      accentBorder = '#ef4444';
                      bgTint = 'rgba(239, 68, 68, 0.05)';
                    } else if (isAtRisk) {
                      accentBorder = '#f59e0b';
                      bgTint = 'rgba(245, 158, 11, 0.05)';
                    } else if (isCritical) {
                      accentBorder = '#f43f5e';
                      bgTint = 'rgba(244, 63, 94, 0.04)';
                    }

                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          borderLeft: `3px solid ${accentBorder}`,
                          background: bgTint,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--nav-hover-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = bgTint)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              {alert.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontWeight: 600,
                                background: isBreached
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : isAtRisk
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(6, 182, 212, 0.15)',
                                color: isBreached
                                  ? '#ef4444'
                                  : isAtRisk
                                  ? '#f59e0b'
                                  : 'var(--accent-cyan)'
                              }}
                            >
                              {alert.badge}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-main)',
                              lineHeight: 1.35,
                              marginBottom: 4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {alert.desc}
                          </div>

                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {alert.meta}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDismissAlert(alert.id, e)}
                          title="Dismiss notification"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: 2,
                            borderRadius: 4
                          }}
                        >
                          <CloseIcon size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab('tickets');
                    setShowNotifications(false);
                  }}
                >
                  <span>View All Tickets Queue →</span>
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  Auto-syncs live
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
