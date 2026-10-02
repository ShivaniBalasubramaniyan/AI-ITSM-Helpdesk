import React, { useState } from 'react';
import {
  MenuIcon,
  BellIcon,
  MoonIcon,
  SunIcon,
  PlusIcon
} from './Icons';

export default function Header({
  activeTab,
  onOpenCreate,
  theme,
  onToggleTheme,
  onToggleMobileMenu
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getPageMeta = (tab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'IT Operations Overview',
          desc: 'Real-time telemetry, automated triage, and SLA compliance'
        };
      case 'tickets':
        return {
          title: 'Ticket Management',
          desc: 'Enterprise incident lifecycle, priority queues, and audit logs'
        };
      case 'assistant':
        return {
          title: 'ITSM Copilot Workspace',
          desc: 'Autonomous RAG diagnostics and guided issue resolution'
        };
      case 'knowledge':
        return {
          title: 'Enterprise Knowledge Base',
          desc: 'Verified IT runbooks, standard operating procedures, and guides'
        };
      case 'servicenow':
        return {
          title: 'ServiceNow Hub',
          desc: 'Bi-directional Table API synchronization and incident bridging'
        };
      case 'analytics':
        return {
          title: 'ITSM Analytics & Intelligence',
          desc: 'Operational velocity, MTTR benchmarks, and AI deflection savings'
        };
      case 'settings':
        return {
          title: 'System Settings & Automation',
          desc: 'Copilot thresholds, ServiceNow credentials, and SLA policies'
        };
      default:
        return {
          title: 'IT Operations Overview',
          desc: 'Autonomous IT Service Management'
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

      {/* Right: Notifications, Theme Toggle, Create Ticket */}
      <div className="header-right-cluster">

        {/* Notifications Icon Button */}
        <div className="header-notification-wrapper">
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title="System Notifications"
          >
            <BellIcon size={18} />
            <span className="notification-badge-dot" />
          </button>

          {showNotifications && (
            <div className="notification-popover">
              <div className="notification-popover-header">
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>System Alerts</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>3 New</span>
              </div>
              <div className="notification-list">
                <div className="notification-item unread">
                  <div className="notification-dot" />
                  <div>
                    <div className="notification-text">SLA At-Risk on INC-1002 (Okta lockout)</div>
                    <div className="notification-time">12m ago • Automated Monitor</div>
                  </div>
                </div>
                <div className="notification-item unread">
                  <div className="notification-dot" />
                  <div>
                    <div className="notification-text">ServiceNow Batch Sync completed (4 updated)</div>
                    <div className="notification-time">35m ago • Table API Connector</div>
                  </div>
                </div>
                <div className="notification-item">
                  <div className="notification-dot muted" />
                  <div>
                    <div className="notification-text">KB-004 revision published by Security Ops</div>
                    <div className="notification-time">2h ago • Knowledge Base</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Single Theme Toggle Button */}
        <button
          type="button"
          className="theme-circle-btn"
          onClick={onToggleTheme}
          aria-label="Switch theme"
          title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
        >
          {theme === 'light' ? (
            <SunIcon size={18} className="theme-svg-icon" />
          ) : (
            <MoonIcon size={18} className="theme-svg-icon" />
          )}
        </button>

        {/* Primary Action Button */}
        <button
          type="button"
          className="btn btn-primary header-create-btn"
          onClick={onOpenCreate}
        >
          <PlusIcon size={16} />
          <span>Create Ticket</span>
        </button>
      </div>
    </header>
  );
}
