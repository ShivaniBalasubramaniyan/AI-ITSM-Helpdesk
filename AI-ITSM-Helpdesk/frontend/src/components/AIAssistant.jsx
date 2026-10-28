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
  PlusIcon,
  MicIcon
} from './Icons';

export default function AIAssistant({
  initialPrompt = '',
  onTicketCreated,
  onOpenKBArticle,
  onNavigateTab,
  onSelectTicket,
  addToast
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Helpdesk Copilot. I have access to verified IT knowledge runbooks and can diagnose issues, recommend step-by-step solutions, or automatically create and route support tickets for you.',
      suggested_kb_articles: [],
      troubleshooting_steps: [],
      suggested_ticket: null,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const hasProcessedInitial = useRef(false);
  const recognitionRef = useRef(null);

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (addToast) addToast('Voice recognition is not supported on this browser (use Chrome or Edge).', 'warning');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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
        if (addToast) addToast('🎙️ Listening... Speak your IT issue clearly', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
        if (addToast) addToast(`Transcribed: "${transcript}"`, 'success');
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech' && addToast) {
          addToast(`Voice error: ${event.error}`, 'warning');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition exception:', err);
      setIsListening(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt && !hasProcessedInitial.current) {
      hasProcessedInitial.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const quickActionCards = [
    {
      title: 'Reset Password & MFA',
      desc: 'Okta, Active Directory & SSO account unlock',
      icon: <LockIcon size={20} />,
      prompt: 'I am locked out of my corporate Okta account and need a password reset'
    },
    {
      title: 'VPN Connection Issues',
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
    'How do I setup MFA on a new company iPhone?',
    'Zoom meeting audio microphone echo issue'
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
          content: 'I encountered an error querying the diagnostic runbook index. However, I can still draft and submit an incident ticket for you immediately:',
          suggested_kb_articles: [],
          troubleshooting_steps: [],
          suggested_ticket: {
            title: text.slice(0, 60),
            description: text,
            requester: 'Shivani B.',
            department: 'Self-Service User',
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
      const rawTitle = (ticketData.title || '').trim();
      const rawDesc = (ticketData.description || '').trim();
      const payload = {
        ...ticketData,
        title: rawTitle.length >= 3 ? rawTitle : `IT Support: ${rawTitle || 'General Incident'}`,
        description: rawDesc.length >= 5 ? rawDesc : `${rawDesc || rawTitle || 'Assistance requested'} (Logged via AI Copilot)`
      };
      const created = await api.createTicket(payload);
      if (onTicketCreated) onTicketCreated(created, { openDetails: false });
      if (addToast) addToast(`Incident ${created.id} logged in ITSM!`, 'success');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Incident **${created.id}** has been successfully registered in the ITSM system. It has been routed to the **${created.assigned_team}** team with **${created.priority}** priority. Your target resolution SLA is **${created.sla_target_hours || 4} hours**.`,
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
        content: 'Session refreshed. How else can I assist with your IT services, devices, or access today?',
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
            <AssistantIcon size={22} />
          </div>
          <div>
            <div className="copilot-title-row">
              <span className="copilot-name">ITSM AI Copilot</span>
              <span className="copilot-status-chip">
                <span className="copilot-status-dot" /> RAG Runbooks Connected
              </span>
            </div>
            <span className="copilot-desc">
              Autonomous diagnostic agent with 1-click incident escalation & approved IT runbook resolution
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

      {/* Main Messages Scrollport */}
      <div className="copilot-chat-container">
        {/* Quick Launch Cards (shown when only welcome message is present) */}
        {messages.length === 1 && (
          <div className="copilot-quick-start">
            <div className="quick-start-title">Common IT Diagnostics:</div>
            <div className="quick-cards-grid">
              {quickActionCards.map((card, idx) => (
                <div
                  key={idx}
                  className="quick-card-item"
                  onClick={() => handleSend(card.prompt)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="quick-card-icon">{card.icon}</div>
                  <div className="quick-card-body">
                    <span className="quick-card-heading">{card.title}</span>
                    <span className="quick-card-desc">{card.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="suggested-questions-row">
              <span className="suggested-q-label">Or ask about:</span>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="suggested-pill"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="copilot-messages-thread">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`copilot-message-row ${isUser ? 'user-row' : 'assistant-row'}`}
              >
                {!isUser && (
                  <div className="assistant-msg-avatar">
                    <AssistantIcon size={18} />
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
                        <span>Recommended Self-Service Steps:</span>
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
                    <div className="ticket-escalation-card glass-card">
                      <div className="escalation-header">
                        <span className="escalation-title">
                          ⚡ Automated Ticket Proposal
                        </span>
                        <span className="badge badge-high">{m.suggested_ticket.priority} Priority</span>
                      </div>
                      <p className="escalation-meta">
                        I have prepared a support ticket classified as <strong>{m.suggested_ticket.category}</strong> for the <strong>{m.suggested_ticket.assigned_team || 'IT Service Desk'}</strong> team.
                      </p>
                      <div className="escalation-details-grid">
                        <div className="escalation-detail-item">
                          <span className="esc-label">Subject:</span>
                          <span className="esc-val">{m.suggested_ticket.title}</span>
                        </div>
                        <div className="escalation-detail-item">
                          <span className="esc-label">Target SLA:</span>
                          <span className="esc-val">{m.suggested_ticket.priority === 'Critical' ? '2 Hours' : m.suggested_ticket.priority === 'High' ? '4 Hours' : '8 Hours'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary escalation-btn"
                        onClick={() => handleCreateTicketFromSuggestion(m.suggested_ticket)}
                        disabled={creatingTicket}
                      >
                        <PlusIcon size={14} />
                        <span>{creatingTicket ? 'Submitting to ITSM...' : 'Confirm & Submit Ticket'}</span>
                      </button>
                    </div>
                  )}

                  {/* Successfully Created Ticket Action Banner */}
                  {m.ticketCreatedInfo && (
                    <div className="ticket-success-card">
                      <div className="ticket-success-header">
                        <span className="ticket-success-check">✓ Registered Incident</span>
                        <span className="ticket-id-tag">{m.ticketCreatedInfo.id}</span>
                      </div>
                      <div className="ticket-success-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            if (onSelectTicket) onSelectTicket(m.ticketCreatedInfo);
                            if (onNavigateTab) onNavigateTab('tickets');
                          }}
                        >
                          View in My Tickets →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="copilot-message-row assistant-row">
              <div className="assistant-msg-avatar">
                <AssistantIcon size={18} />
              </div>
              <div className="copilot-bubble assistant-bubble loading-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                  Querying IT runbook index & analyzing classification...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="copilot-input-area">
        <form
          className="copilot-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="copilot-input"
            placeholder="Type your issue or question... (e.g., 'Cisco VPN connection timed out' or 'Create ticket for broken monitor')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-secondary copilot-voice-btn"
            onClick={toggleVoiceInput}
            disabled={loading}
            style={{
              background: isListening ? '#ef4444' : undefined,
              color: isListening ? '#ffffff' : undefined,
              borderColor: isListening ? '#ef4444' : undefined,
              boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : undefined
            }}
            title={isListening ? "Listening... Click to stop" : "Speak via Microphone (Voice Dictation)"}
          >
            <MicIcon size={16} />
            <span>{isListening ? 'Listening...' : 'Voice'}</span>
          </button>
          <button
            type="submit"
            className="btn btn-primary copilot-send-btn"
            disabled={loading || !input.trim()}
            title="Send Message"
          >
            <SendIcon size={16} />
            <span>Send</span>
          </button>
        </form>
        <div className="copilot-footer-meta">
          <span>AI ITSM Copilot v1.0 • Connected to 8 verified runbooks • Bi-directional ServiceNow Sync Ready</span>
        </div>
      </div>
    </div>
  );
}
