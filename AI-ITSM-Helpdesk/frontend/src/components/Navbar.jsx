import React from 'react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenCreate,
  backendHealth,
  theme,
  onToggleTheme
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tickets', label: 'Ticket Management', icon: '🎫' },
    { id: 'assistant', label: 'AI Helpdesk Assistant', icon: '🤖' },
    { id: 'knowledge', label: 'Knowledge Base', icon: '📚' },
    { id: 'servicenow', label: 'ServiceNow Hub', icon: '🔄' }
  ];

  return (
    <header className="header-nav">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>⚡</span>
        </div>
        <div>
          <div className="brand-title">AI-ITSM</div>
          <div className="brand-subtitle">Intelligent Helpdesk Automation</div>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <div className="health-badge" title="FastAPI Backend Health Status">
          <span className="health-dot"></span>
          <span>{backendHealth ? 'API Live (8000)' : 'Connecting...'}</span>
        </div>

        {/* Single Theme Toggle Button: Moon (Dark) / Sun (Light) */}
        <button
          type="button"
          className="theme-circle-btn"
          onClick={onToggleTheme}
          aria-label="Switch theme"
          title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
        >
          {theme === 'light' ? (
            <svg
              className="theme-svg-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg
              className="theme-svg-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <span>+</span>
          <span>Create Ticket</span>
        </button>
      </div>
    </header>
  );
}
