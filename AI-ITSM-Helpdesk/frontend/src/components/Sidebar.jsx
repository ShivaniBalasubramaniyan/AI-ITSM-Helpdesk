import React from 'react';
import {
  BrandLogo,
  DashboardIcon,
  TicketsIcon,
  AssistantIcon,
  KnowledgeIcon,
  ServiceNowIcon,
  MoonIcon,
  SunIcon,
  CloseIcon
} from './Icons';

export default function Sidebar({
  activeTab,
  setActiveTab,
  openTicketCount = 0,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile
}) {
  const selfServiceNav = [
    {
      id: 'dashboard',
      label: 'Helpdesk Home',
      icon: <DashboardIcon size={18} />,
      desc: 'Portal & Quick Actions'
    },
    {
      id: 'assistant',
      label: 'AI Copilot Assistant',
      icon: <AssistantIcon size={18} />,
      badge: 'Live AI',
      badgeClass: 'badge-live-ai',
      desc: 'Instant Troubleshooting'
    },
    {
      id: 'tickets',
      label: 'My Tickets & Requests',
      icon: <TicketsIcon size={18} />,
      badge: openTicketCount > 0 ? `${openTicketCount}` : null,
      badgeClass: 'badge-ticket-count',
      desc: 'Active & Historical'
    },
    {
      id: 'knowledge',
      label: 'Knowledge Runbooks',
      icon: <KnowledgeIcon size={18} />,
      desc: 'Self-Service Guides'
    }
  ];

  const integrationNav = [
    {
      id: 'servicenow',
      label: 'ServiceNow Sync',
      icon: <ServiceNowIcon size={18} />,
      badge: 'Sync',
      desc: 'Enterprise Bridge'
    }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`enterprise-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Top Brand Header */}
        <div className="sidebar-brand-header">
          <div className="sidebar-brand-left">
            <BrandLogo size={36} />
            <div className="sidebar-brand-text">
              <span className="brand-name">AI-ITSM</span>
              <span className="brand-subtitle">Smart Employee Helpdesk</span>
            </div>
          </div>
          {mobileOpen && (
            <button
              className="sidebar-mobile-close"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="sidebar-nav-container">
          {/* SELF-SERVICE PORTAL */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-title">SELF-SERVICE PORTAL</div>
            <nav className="sidebar-menu">
              {selfServiceNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <div className="sidebar-nav-text-block">
                      <span className="sidebar-nav-label">{item.label}</span>
                      <span className="sidebar-nav-sublabel">{item.desc}</span>
                    </div>
                    {item.badge && (
                      <span className={`sidebar-nav-pill ${item.badgeClass || ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ENTERPRISE BRIDGE */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-title">INTEGRATIONS</div>
            <nav className="sidebar-menu">
              {integrationNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <div className="sidebar-nav-text-block">
                      <span className="sidebar-nav-label">{item.label}</span>
                      <span className="sidebar-nav-sublabel">{item.desc}</span>
                    </div>
                    {item.badge && (
                      <span className="sidebar-nav-pill sidebar-nav-pill-muted">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile & Theme Switcher in Sidebar Footer */}
        <div className="sidebar-user-footer">
          <div className="user-profile-card">
            <div className="user-avatar-wrap">
              <div className="user-avatar-initials">SB</div>
              <span className="user-status-dot" title="Active on network" />
            </div>
            <div className="user-meta">
              <span className="user-name">Shivani B.</span>
              <span className="user-role">Self-Service Portal</span>
            </div>
            <button
              type="button"
              className="sidebar-theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
