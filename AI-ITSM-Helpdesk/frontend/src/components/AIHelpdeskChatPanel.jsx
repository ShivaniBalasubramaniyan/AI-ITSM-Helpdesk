import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import {
  SendIcon,
  CloseIcon,
  RefreshIcon,
  CheckIcon,
  PlusIcon
} from './Icons';

export default function AIHelpdeskChatPanel({
  isOpen = true,
  onClose,
  onTicketCreated,
  onOpenKBArticle,
  addToast
}) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_itsm_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your AI Helpdesk Assistant. How can I assist you with IT support, system access, or troubleshooting today?',
        suggested_kb_articles: [],
        troubleshooting_steps: [],
        suggested_ticket: null,
        timestamp: 'Just now'
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Close assistant when clicking or touching anywhere outside the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      // 1. If clicked/touched inside the assistant panel, do not close
      if (
        panelRef.current &&
        (panelRef.current === e.target ||
          panelRef.current.contains(e.target) ||
          (e.target.closest && e.target.closest('.ai-chat-panel')))
      ) {
        return;
      }

      // 2. Ignore clicks on the floating robot button (let its own onClick toggle it)
      if (
        e.target.closest &&
        (e.target.closest('#floating-ai-assistant-btn') ||
          e.target.closest('.floating-ai-assistant-btn'))
      ) {
        return;
      }

      // 3. Ignore clicks on the sidebar assistant navigation button
      if (e.target.closest && e.target.closest('[data-nav-id="assistant"]')) {
        return;
      }

      // 4. Clicked outside -> close assistant
      if (onClose) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  const prevIsOpenRef = useRef(isOpen);

  // When assistant panel is closed, reset conversation so opening it again starts a fresh new chat session
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am your AI Helpdesk Assistant. How can I assist you with IT support, system access, or troubleshooting today?',
          suggested_kb_articles: [],
          troubleshooting_steps: [],
          suggested_ticket: null,
          timestamp: 'Just now'
        }
      ]);
      try {
        localStorage.removeItem('ai_itsm_chat_history');
      } catch (e) {
        console.error('Failed to clear chat history:', e);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Save current messages to localStorage while open
  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.setItem('ai_itsm_chat_history', JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history:', e);
      }
    }
  }, [messages, isOpen]);

  // Auto-focus and scroll to bottom whenever assistant is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const quickPills = [
    'Reset corporate Okta password',
    'Cisco VPN authentication failed',
    'Wi-Fi disconnecting in conference room',
    'Outlook desktop client disconnected'
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
      if (addToast) addToast(`Assistant error: ${err.message}`, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I encountered an error querying the diagnostic engine. Would you like me to create an incident ticket for you?',
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

  const handleCreateTicket = async (ticketData) => {
    if (!ticketData || creatingTicket) return;
    try {
      setCreatingTicket(true);
      const rawTitle = (ticketData.title || '').trim();
      const rawDesc = (ticketData.description || '').trim();
      const payload = {
        ...ticketData,
        title: rawTitle.length >= 3 ? rawTitle : `IT Support: ${rawTitle || 'General Incident'}`,
        description: rawDesc.length >= 5 ? rawDesc : `${rawDesc || rawTitle || 'Assistance requested'} (Logged via AI Copilot)`
      };
      const created = await api.createTicket(payload);
      if (onTicketCreated) onTicketCreated(created);
      if (addToast) addToast(`Incident ${created.id} created!`, 'success');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Incident **${created.id}** has been registered in the ITSM system for the **${created.assigned_team}** team with **${created.priority}** priority. Target SLA: **${created.sla_target_hours} hours**.`,
          suggested_kb_articles: [],
          troubleshooting_steps: [],
          suggested_ticket: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      if (addToast) addToast(`Failed to create ticket: ${err.message}`, 'error');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleResetSession = () => {
    const freshWelcome = [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Session refreshed. How else can I assist with your IT services or access requests today?',
        suggested_kb_articles: [],
        troubleshooting_steps: [],
        suggested_ticket: null,
        timestamp: 'Just now'
      }
    ];
    setMessages(freshWelcome);
    try {
      localStorage.removeItem('ai_itsm_chat_history');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      ref={panelRef}
      className={`ai-chat-panel ${!isOpen ? 'panel-closed' : ''}`}
      role="region"
      aria-label="AI Helpdesk Assistant"
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      {/* Modern Header */}
      <div className="ai-chat-panel-header">
        <div className="ai-chat-header-identity">
          <div className="ai-chat-robot-avatar">
            <img
              src="/robot_assistant.png"
              alt="AI Robot Assistant"
              className="ai-chat-robot-avatar-img"
            />
            <span className="ai-chat-online-dot" />
          </div>
          <div className="ai-chat-title-group">
            <div className="ai-chat-header-title">AI Helpdesk Assistant</div>
            <div className="ai-chat-header-subtitle">ITSM Copilot • Active Runbooks</div>
          </div>
        </div>

        <div className="ai-chat-header-actions">
          <button
            type="button"
            className="ai-chat-action-btn"
            onClick={handleResetSession}
            title="Start New Conversation (Clear History)"
            aria-label="Start New Conversation"
          >
            <RefreshIcon size={14} />
          </button>
          <button
            type="button"
            className="ai-chat-action-btn ai-chat-close-btn"
            onClick={onClose}
            title="Close Assistant"
            aria-label="Close Assistant"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="ai-chat-panel-body">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`ai-chat-msg-row ${isUser ? 'user-row' : 'bot-row'}`}
            >
              {!isUser && (
                <div className="ai-chat-bot-avatar-tiny">
                  <img
                    src="/robot_assistant.png"
                    alt="Robot"
                    className="ai-chat-bot-avatar-img"
                  />
                </div>
              )}

              <div className={`ai-chat-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
                <div className="ai-chat-bubble-content">
                  {m.content}
                </div>

                {/* Structured Troubleshooting Steps */}
                {m.troubleshooting_steps && m.troubleshooting_steps.length > 0 && (
                  <div className="ai-chat-steps-card">
                    <div className="ai-chat-steps-title">
                      <span className="ai-chat-title-icon" aria-hidden="true">
                        <CheckIcon size={14} />
                      </span>
                      <span>Recommended Steps:</span>
                    </div>
                    <ol className="ai-chat-steps-list">
                      {m.troubleshooting_steps.map((step, idx) => {
                        const cleanStep = typeof step === 'string'
                          ? step.replace(/^svg(?=[A-Z])/i, '').replace(/^svg\s+/i, '')
                          : step;
                        return <li key={idx}>{cleanStep}</li>;
                      })}
                    </ol>
                  </div>
                )}

                {/* Knowledge Base Runbook Links */}
                {m.suggested_kb_articles && m.suggested_kb_articles.length > 0 && (
                  <div className="ai-chat-kb-card">
                    <div className="ai-chat-kb-title">Suggested Runbooks:</div>
                    <div className="ai-chat-kb-list">
                      {m.suggested_kb_articles.map((kb) => (
                        <button
                          key={kb.id}
                          type="button"
                          className="ai-chat-kb-item"
                          onClick={() => onOpenKBArticle && onOpenKBArticle(kb.id)}
                        >
                          <span className="ai-chat-kb-id">{kb.id}</span>
                          <span className="ai-chat-kb-text">{kb.title}</span>
                          <span className="ai-chat-kb-arrow">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Support Ticket Escalation Card */}
                {m.suggested_ticket && (
                  <div className="ai-chat-escalation-card">
                    <div className="ai-chat-escalation-text">
                      Need further engineering help? Create a tracked support ticket:
                    </div>
                    <button
                      type="button"
                      className="ai-chat-ticket-btn"
                      onClick={() => handleCreateTicket(m.suggested_ticket)}
                      disabled={creatingTicket}
                    >
                      <span className="ai-chat-btn-icon" aria-hidden="true">
                        <PlusIcon size={14} />
                      </span>
                      <span>{creatingTicket ? 'Submitting...' : 'Create Support Ticket'}</span>
                    </button>
                  </div>
                )}

                <div className="ai-chat-timestamp">{m.timestamp}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="ai-chat-msg-row bot-row">
            <div className="ai-chat-bot-avatar-tiny">
              <img
                src="/robot_assistant.png"
                alt="Robot"
                className="ai-chat-bot-avatar-img"
              />
            </div>
            <div className="ai-chat-bubble bot-bubble loading-bubble">
              <div className="ai-chat-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (visible when only welcome message exists) */}
      {messages.length <= 1 && (
        <div className="ai-chat-suggestions">
          <div className="ai-chat-suggestions-title">Quick Inquiries:</div>
          <div className="ai-chat-pills-wrap">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-chat-pill"
                onClick={() => handleSend(pill)}
                disabled={loading}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area at Bottom */}
      <div className="ai-chat-panel-footer">
        <form
          className="ai-chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-input-field"
            placeholder="Ask AI Helpdesk Assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="ai-chat-submit-btn"
            disabled={loading || !input.trim()}
            title="Send Message"
            aria-label="Send Message"
          >
            <SendIcon size={15} />
          </button>
        </form>
        <div className="ai-chat-disclaimer">
          Enterprise ITSM Copilot • Connected to RAG Knowledge Base
        </div>
      </div>
    </div>
  );
}
