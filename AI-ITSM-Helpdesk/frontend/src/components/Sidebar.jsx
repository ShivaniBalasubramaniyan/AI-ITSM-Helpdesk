import React from 'react';
import {
  BrandLogo,
  DashboardIcon,
  TicketsIcon,
  AssistantIcon,
  KnowledgeIcon,
  ServiceNowIcon,
  AnalyticsIcon,
  SettingsIcon,
  CloseIcon
} from './Icons';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onAssistantTabClick,
  isAssistantOpen,
  mobileOpen,
  onCloseMobile
}) {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'tickets', label: 'Ticket Management', icon: <TicketsIcon /> },
    { id: 'assistant', label: 'AI Helpdesk Assistant', icon: <AssistantIcon />, badge: 'Copilot' },
    { id: 'knowledge', label: 'Knowledge Base', icon: <KnowledgeIcon /> },
    { id: 'servicenow', label: 'ServiceNow Hub', icon: <ServiceNowIcon /> }
  ];

  const managementNav = [
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> }
  ];

  const handleNavClick = (id) => {
    if (id === 'assistant' && onAssistantTabClick) {
      onAssistantTabClick();
      if (onCloseMobile) onCloseMobile();
      return;
    }
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
            <BrandLogo size={34} />
            <div className="sidebar-brand-text">
              <span className="brand-name">AI-ITSM</span>
              <span className="brand-subtitle">Intelligent Helpdesk</span>
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
          {/* MAIN SECTION */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-title">MAIN</div>
            <nav className="sidebar-menu">
              {mainNav.map((item) => {
                const isActive = item.id === 'assistant' ? isAssistantOpen : activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-nav-pill">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* MANAGEMENT SECTION */}
          <div className="sidebar-nav-group">
            <div className="sidebar-group-title">MANAGEMENT</div>
            <nav className="sidebar-menu">
              {managementNav.map((item) => {
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
                    <span className="sidebar-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
