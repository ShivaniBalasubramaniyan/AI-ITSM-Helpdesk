import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import {
  AssistantIcon,
  SearchIcon,
  SendIcon,
  LockIcon,
  WifiIcon,
  LaptopIcon,
  MailIcon,
  ShieldIcon,
  CheckIcon,
  RefreshIcon,
  PlusIcon
} from './Icons';

export default function AIAssistant({ onTicketCreated, onOpenKBArticle, addToast }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Good morning. I am your ITSM Copilot, connected to the enterprise knowledge base and incident automation engine. How can I assist you today?',
      suggested_kb_articles: [],
      troubleshooting_steps: [],
      suggested_ticket: null,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickActionCards = [
    {
      title: 'Reset Password',
      desc: 'Okta, Active Directory & SSO account unlock',
      icon: <LockIcon size={20} />,
      prompt: 'I am locked out of my corporate Okta account and need a password reset'
    },
    {
      title: 'VPN Connection',
      desc: 'Cisco AnyConnect & gateway timeout diagnostics',
      icon: <WifiIcon size={20} />,
      prompt: 'My Cisco AnyConnect VPN fails to authenticate and times out'
    },
    {
      title: 'Laptop & Hardware',
      desc: 'Thunderbolt dock, display & thermal diagnostics',
      icon: <LaptopIcon size={20} />,
      prompt: 'External monitor is flickering when connected to Thunderbolt 4 dock'
    },
    {
      title: 'Email & Exchange',
      desc: 'Outlook sync, calendar delegation & mailbox full',
      icon: <MailIcon size={20} />,
      prompt: 'Outlook desktop client is disconnected and not sending or receiving emails'
    }
  ];

  const suggestedQuestions = [
    'How do I request a JetBrains PyCharm IDE commercial license?',
    'Wi-Fi keeps disconnecting in Building 3 conference room',
    'How do I setup MFA on a new company iPhone?'
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.askAIAssistant(text);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        suggested_kb_articles: response.suggested_kb_articles || [],
        troubleshooting_steps: response.troubleshooting_steps || [],
        suggested_ticket: response.suggested_ticket || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      if (addToast) addToast(`Copilot error: ${err.message}`, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I encountered an error accessing the IT diagnostic engine. Would you like me to open a support ticket for our engineering desk directly?',
          suggested_kb_articles: [],
          troubleshooting_steps: [],
          suggested_ticket: {
            title: text.slice(0, 60),
            description: text,
            requester: 'Current User',
            department: 'IT User',
            category: 'Software',
            priority: 'Medium',
            urgency: 'Medium',
            impact: 'Medium',
            assigned_team: 'IT Service Desk'
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicketFromSuggestion = async (ticketData) => {
    if (!ticketData || creatingTicket) return;
    try {
      setCreatingTicket(true);
      const created = await api.createTicket(ticketData);
      if (onTicketCreated) onTicketCreated(created);
      if (addToast) addToast(`Incident ${created.id} created automatically!`, 'success');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Incident **${created.id}** has been registered in the ITSM database. It has been routed to the **${created.assigned_team}** team with **${created.priority}** priority. Target SLA resolution is **${created.sla_target_hours} hours**.`,
          suggested_kb_articles: [],
          troubleshooting_steps: [],
          suggested_ticket: null,
          ticketCreatedInfo: created,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      if (addToast) addToast(`Failed to create ticket: ${err.message}`, 'error');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Session refreshed. How else can I assist with your IT infrastructure or access requests today?',
        suggested_kb_articles: [],
        troubleshooting_steps: [],
        suggested_ticket: null,
        timestamp: 'Just now'
      }
    ]);
  };

  return (
    <div className="copilot-workspace">
      {/* Workspace Header */}
      <div className="copilot-top-bar">
        <div className="copilot-identity">
          <div className="copilot-avatar-badge">
            <AssistantIcon size={20} />
          </div>
          <div>
            <div className="copilot-title-row">
              <span className="copilot-name">ITSM Copilot</span>
              <span className="copilot-status-chip">
                <span className="copilot-status-dot" /> Enterprise RAG Connected
              </span>
            </div>
            <span className="copilot-desc">
              Autonomous diagnostic agent indexing approved IT standard operating runbooks
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleClearHistory}
          title="Reset conversation session"
        >
          <RefreshIcon size={14} />
          <span>New Session</span>
        </button>
      </div>

      {/* Quick Action Diagnostic Cards (visible when thread is fresh) */}
      {messages.length <= 1 && (
        <div className="copilot-hero-section">
          <div className="copilot-hero-heading">
            <h2>Good morning. How can I help resolve your IT issue?</h2>
            <p>Select a common diagnostic workflow or describe any problem in the input below.</p>
          </div>

          <div className="quick-actions-grid">
            {quickActionCards.map((card, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-action-card"
                onClick={() => handleSend(card.prompt)}
                disabled={loading}
              >
                <div className="quick-action-icon">{card.icon}</div>
                <div className="quick-action-content">
                  <div className="quick-action-title">{card.title}</div>
                  <div className="quick-action-desc">{card.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversational Stream */}
      <div className="copilot-chat-container">
        <div className="copilot-messages-area">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`copilot-message-row ${isUser ? 'user-row' : 'assistant-row'}`}
              >
                {!isUser && (
                  <div className="assistant-msg-avatar">
                    <AssistantIcon size={16} />
                  </div>
                )}

                <div className={`copilot-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                  <div className="bubble-header">
                    <span className="bubble-author">{isUser ? 'You' : 'ITSM Copilot'}</span>
                    <span className="bubble-time">{m.timestamp}</span>
                  </div>

                  <div className="bubble-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>

                  {/* Structured Troubleshooting Steps */}
                  {m.troubleshooting_steps && m.troubleshooting_steps.length > 0 && (
                    <div className="troubleshooting-card">
                      <div className="card-section-title">
                        <span className="card-section-icon" aria-hidden="true">
                          <CheckIcon size={14} />
                        </span>
                        <span>Recommended Remediation Steps:</span>
                      </div>
                      <ol className="troubleshoot-list">
                        {m.troubleshooting_steps.map((step, idx) => {
                          const cleanStep = typeof step === 'string'
                            ? step.replace(/^svg(?=[A-Z])/i, '').replace(/^svg\s+/i, '')
                            : step;
                          return <li key={idx}>{cleanStep}</li>;
                        })}
                      </ol>
                    </div>
                  )}

                  {/* Referenced Knowledge Base Articles */}
                  {m.suggested_kb_articles && m.suggested_kb_articles.length > 0 && (
                    <div className="referenced-kb-card">
                      <div className="card-section-title">
                        Verified Knowledge Base Runbooks:
                      </div>
                      <div className="kb-links-list">
                        {m.suggested_kb_articles.map((kb) => (
                          <div
                            key={kb.id}
                            className="kb-reference-item"
                            onClick={() => onOpenKBArticle && onOpenKBArticle(kb.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="kb-ref-left">
                              <span className="kb-ref-id">{kb.id}</span>
                              <span className="kb-ref-title">{kb.title}</span>
                            </div>
                            <span className="kb-ref-cta">View Runbook →</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Ticket Escalation Card */}
                  {m.suggested_ticket && (
                    <div className="ticket-escalation-card">
                      <div className="escalation-header">
                        <span className="escalation-title">
                          I couldn't resolve this automatically. Would you like me to create a support ticket?
                        </span>
                      </div>
                      <p className="escalation-meta">
                        Pre-classified as <strong>{m.suggested_ticket.category}</strong> with <strong>{m.suggested_ticket.priority}</strong> priority for the <strong>{m.suggested_ticket.assigned_team || 'IT Service Desk'}</strong>.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm escalation-btn"
                        onClick={() => handleCreateTicketFromSuggestion(m.suggested_ticket)}
                        disabled={creatingTicket}
                      >
                        <span className="escalation-btn-icon" aria-hidden="true">
                          <PlusIcon size={14} />
                        </span>
                        <span>{creatingTicket ? 'Submitting Incident...' : 'Create Support Ticket'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="copilot-message-row assistant-row">
              <div className="assistant-msg-avatar">
                <AssistantIcon size={16} />
              </div>
              <div className="copilot-bubble assistant-bubble loading-bubble">
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="typing-text">Querying enterprise RAG knowledge base & synthesizing diagnosis...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div className="copilot-input-dock">
          {/* Quick suggestions pills */}
          <div className="copilot-quick-pills">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="copilot-pill"
                onClick={() => handleSend(q)}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="copilot-input-bar">
            <input
              type="text"
              className="copilot-text-input"
              placeholder="Describe your IT issue, error code, or request (e.g. VPN timeout, Okta lockout)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <button
              type="button"
              className="copilot-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <SendIcon size={16} />
            </button>
          </div>
          <div className="copilot-input-hint">
            <span>Press <strong>Enter ↵</strong> to send. ITSM Copilot references verified company IT runbooks.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
