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
  const [assistantInitialQuery, setAssistantInitialQuery] = useState('');

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

  const handleTicketCreated = (newTicket, options = { openDetails: true }) => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      assignee: '',
      sla: '',
      search: ''
    });
    setTickets((prev) => {
      const filtered = prev.filter((t) => t.id !== newTicket.id);
      return [newTicket, ...filtered];
    });
    loadTickets();
    loadDashboardStats();
    setActiveTab('tickets');
    if (options?.openDetails) {
      setSelectedTicket(newTicket);
    }
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

  const handleAskCopilotWithPrompt = (prompt) => {
    setAssistantInitialQuery(prompt);
    setActiveTab('assistant');
  };

  const [createInitialData, setCreateInitialData] = useState(null);

  const handleOpenCreate = (initialData = null) => {
    setCreateInitialData(initialData);
    setIsCreateOpen(true);
  };

  const openTicketsCount = (tickets || []).filter(
    (t) => t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  return (
    <div className="enterprise-layout-root" data-theme={theme}>
      {/* User-Centric Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTicketCount={openTicketsCount}
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
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenCreate={() => handleOpenCreate()}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileMenu={() => setMobileSidebarOpen((prev) => !prev)}
          tickets={tickets}
          onSelectTicket={(t) => setSelectedTicket(t)}
          backendHealth={backendHealth}
        />

        {/* Dynamic Page Views */}
        <main className="enterprise-page-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onOpenCreate={handleOpenCreate}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenKBArticle={handleOpenKBArticle}
              onAskCopilotWithPrompt={handleAskCopilotWithPrompt}
              addToast={addToast}
              onRefreshStats={loadDashboardStats}
            />
          )}

          {activeTab === 'assistant' && (
            <AIAssistant
              initialPrompt={assistantInitialQuery}
              onTicketCreated={handleTicketCreated}
              onOpenKBArticle={handleOpenKBArticle}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectTicket={(t) => setSelectedTicket(t)}
              addToast={addToast}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketList
              tickets={tickets}
              filters={filters}
              setFilters={setFilters}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onOpenCreate={() => handleOpenCreate()}
              onTicketsChanged={loadTickets}
              addToast={addToast}
              loading={loadingTickets}
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
        </main>
      </div>

      {/* Global Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleTicketUpdated}
          onTicketDeleted={handleTicketDeleted}
          addToast={addToast}
        />
      )}

      {isCreateOpen && (
        <CreateTicketModal
          initialData={createInitialData}
          onClose={() => {
            setIsCreateOpen(false);
            setCreateInitialData(null);
          }}
          onTicketCreated={handleTicketCreated}
          addToast={addToast}
        />
      )}

      {/* Floating AI Copilot Quick Drawer Button & Panel (Optional Quick-Access) */}
      <button
        id="floating-ai-assistant-btn"
        className="floating-ai-assistant-btn"
        onClick={() => setIsAssistantOpen((prev) => !prev)}
        title="Quick AI Helpdesk Assistant"
        aria-label="Open Floating AI Helpdesk Assistant"
      >
        <img
          src="/robot_assistant.png"
          alt="AI Robot"
          className="floating-robot-img"
        />
        <span className="floating-robot-ping" />
      </button>

      {isAssistantOpen && (
        <AIHelpdeskChatPanel
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          onTicketCreated={handleTicketCreated}
          onOpenKBArticle={handleOpenKBArticle}
          addToast={addToast}
        />
      )}

      {/* Toast Notification Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-pill toast-${toast.type}`}>
            <span className="toast-dot" />
            <span className="toast-msg">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
