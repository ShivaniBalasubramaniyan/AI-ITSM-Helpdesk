import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import TicketDetailModal from './components/TicketDetailModal';
import CreateTicketModal from './components/CreateTicketModal';
import AIAssistant from './components/AIAssistant';
import AIHelpdeskChatPanel from './components/AIHelpdeskChatPanel';
import KnowledgeBase from './components/KnowledgeBase';
import ServiceNowHub from './components/ServiceNowHub';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import { api } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendHealth, setBackendHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedKBArticleId, setSelectedKBArticleId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isRobotJumping, setIsRobotJumping] = useState(false);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_itsm_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    priority: 'All',
    category: 'All',
    assignee: 'All',
    sla: 'All'
  });

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    try {
      localStorage.setItem('ai_itsm_theme', theme);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    checkHealth();
    loadDashboardStats();
    loadTickets();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setBackendHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setBackendHealth(null);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadTickets = async () => {
    try {
      setLoadingTickets(true);
      const data = await api.getTickets(filters);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleTicketCreated = (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    loadDashboardStats();
  };

  const handleTicketUpdated = (updatedTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
    setSelectedTicket(updatedTicket);
    loadDashboardStats();
  };

  const handleTicketDeleted = (deletedId) => {
    setTickets((prev) => prev.filter((t) => t.id !== deletedId));
    loadDashboardStats();
  };

  const handleOpenKBArticle = (artId) => {
    setSelectedKBArticleId(artId);
    setActiveTab('knowledge');
  };

  const handleToggleAssistant = () => {
    setIsAssistantOpen((prev) => !prev);
  };

  const handleAssistantNavClick = () => {
    // Smooth jump/bounce animation (600ms), then automatically open the assistant
    setIsRobotJumping(true);
    setTimeout(() => {
      setIsAssistantOpen(true);
      setIsRobotJumping(false);
    }, 600);
  };

  return (
    <div className="enterprise-layout-root" data-theme={theme}>
      {/* Permanent Desktop / Collapsible Mobile Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAssistantTabClick={handleAssistantNavClick}
        isAssistantOpen={isAssistantOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="enterprise-main-viewport">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onOpenCreate={() => setIsCreateOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
          onGlobalSearch={(query) => {
            setFilters((f) => ({ ...f, search: query }));
            setActiveTab('tickets');
          }}
        />

        {/* Dynamic Page Views */}
        <main className="enterprise-page-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onOpenCreate={() => setIsCreateOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketList
              tickets={tickets}
              filters={filters}
              setFilters={setFilters}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onOpenCreate={() => setIsCreateOpen(true)}
              loading={loadingTickets}
            />
          )}

          {activeTab === 'assistant' && (
            <AIAssistant
              onTicketCreated={handleTicketCreated}
              onOpenKBArticle={handleOpenKBArticle}
              addToast={addToast}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBase
              selectedArticleId={selectedKBArticleId}
              onCloseDetail={() => setSelectedKBArticleId(null)}
              addToast={addToast}
            />
          )}

          {activeTab === 'servicenow' && (
            <ServiceNowHub
              addToast={addToast}
              onRefreshTickets={loadTickets}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics stats={stats} />
          )}

          {activeTab === 'settings' && (
            <Settings addToast={addToast} />
          )}
        </main>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleTicketUpdated}
          onTicketDeleted={handleTicketDeleted}
          addToast={addToast}
        />
      )}

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <CreateTicketModal
          onClose={() => setIsCreateOpen(false)}
          onTicketCreated={handleTicketCreated}
          addToast={addToast}
        />
      )}

      {/* Floating AI Helpdesk Assistant Robot Button at bottom-right */}
      <button
        type="button"
        id="floating-ai-assistant-btn"
        className={`floating-ai-assistant-btn ${isRobotJumping ? 'jumping' : ''} ${isAssistantOpen ? 'panel-open' : ''}`}
        onClick={handleToggleAssistant}
        aria-label={isAssistantOpen ? "Close AI Helpdesk Assistant" : "Open AI Helpdesk Assistant"}
        title={isAssistantOpen ? "Close AI Helpdesk Assistant" : "Open AI Helpdesk Assistant"}
      >
        <img
          src="/robot_assistant.png"
          alt="AI Helpdesk Assistant"
          className="floating-ai-robot-img"
        />
        <span className="floating-ai-status-dot" title="AI Helpdesk Assistant Active" />
      </button>

      {/* Floating AI Helpdesk Assistant Chat Panel (Kept mounted to preserve conversation & solutions) */}
      <AIHelpdeskChatPanel
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onTicketCreated={handleTicketCreated}
        onOpenKBArticle={handleOpenKBArticle}
        addToast={addToast}
      />

      {/* Global Toast Notification Stack */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="toast-icon">
              {t.type === 'success' ? '✔' : t.type === 'error' ? '✖' : 'ℹ'}
            </span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
