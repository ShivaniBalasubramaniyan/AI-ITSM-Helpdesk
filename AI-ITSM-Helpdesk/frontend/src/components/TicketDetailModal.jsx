import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  CloseIcon,
  CheckIcon,
  RefreshIcon,
  AssistantIcon,
  ServiceNowIcon
} from './Icons';

export default function TicketDetailModal({
  ticket,
  onClose,
  onTicketUpdated,
  onTicketDeleted,
  addToast
}) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [syncingSN, setSyncingSN] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolution_notes || '');
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [editTeam, setEditTeam] = useState(ticket.assigned_team || 'IT Service Desk');
  const [editAgent, setEditAgent] = useState(ticket.assigned_agent || 'Unassigned');
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [autoResolving, setAutoResolving] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [commentAuthor, setCommentAuthor] = useState(
    ticket.assigned_agent && ticket.assigned_agent !== 'Unassigned'
      ? ticket.assigned_agent
      : 'IT Staff'
  );
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('discussion');

  useEffect(() => {
    if (ticket?.id) {
      loadHistory();
      loadDiagnosis();
      loadComments();
      setEditTeam(ticket.assigned_team || 'IT Service Desk');
      setEditAgent(ticket.assigned_agent || 'Unassigned');
      setCommentAuthor(
        ticket.assigned_agent && ticket.assigned_agent !== 'Unassigned'
          ? ticket.assigned_agent
          : 'IT Staff'
      );
      setCheckedSteps({});
    }
  }, [ticket?.id]);

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const data = await api.getTicketComments(ticket.id);
      setComments(data || []);
    } catch (err) {
      console.warn('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newComment = await api.addTicketComment(ticket.id, {
        body: commentText.trim(),
        author: commentAuthor.trim() || 'IT Staff',
        author_role: isInternalNote ? 'IT Support Engineer' : 'Helpdesk Agent',
        is_internal: isInternalNote
      });

      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      if (addToast) {
        addToast(
          isInternalNote
            ? '🔒 Internal work note saved to ticket'
            : '💬 Public update posted',
          'success'
        );
      }
      loadHistory();
    } catch (err) {
      if (addToast) addToast(`Failed to post note: ${err.message}`, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const loadDiagnosis = async () => {
    try {
      setLoadingDiagnosis(true);
      const diag = await api.getTicketDiagnosis(ticket.id);
      setDiagnosis(diag);
      if (!resolutionNotes && diag?.suggested_resolution_notes) {
        setResolutionNotes(diag.suggested_resolution_notes);
      }
    } catch (err) {
      console.warn('Diagnosis not available:', err);
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const handle1ClickAutoResolve = async () => {
    try {
      setAutoResolving(true);
      const notesToUse = resolutionNotes || diagnosis?.suggested_resolution_notes || 'Auto-resolved via ITSM AI Copilot runbook.';
      const updated = await api.autoResolveTicket(ticket.id, notesToUse, 'AI Autonomous Copilot');
      onTicketUpdated(updated);
      setShowResolveInput(false);
      if (addToast) addToast(`⚡ Incident ${ticket.id} auto-resolved with AI runbook! Synced to MongoDB Atlas.`, 'success');
      loadHistory();
    } catch (err) {
      if (addToast) addToast(`Auto-resolution failed: ${err.message}`, 'error');
    } finally {
      setAutoResolving(false);
    }
  };

  const handleSaveAssignee = async () => {
    try {
      setSavingAssignee(true);
      const updated = await api.updateTicket(ticket.id, {
        assigned_team: editTeam,
        assigned_agent: editAgent,
        actor: 'IT Dispatcher'
      });
      onTicketUpdated(updated);
      setIsEditingAssignee(false);
      if (addToast) addToast(`Reassigned to ${editAgent} (${editTeam})`, 'success');
      loadHistory();
    } catch (err) {
      if (addToast) addToast(`Reassignment failed: ${err.message}`, 'error');
    } finally {
      setSavingAssignee(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.getTicketHistory(ticket.id);
      setHistory(data);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusTransition = async (newStatus) => {
    if (newStatus === 'Resolved' && !showResolveInput) {
      setShowResolveInput(true);
      return;
    }

    try {
      setTransitioning(true);
      const updated = await api.transitionTicket(
        ticket.id,
        newStatus,
        'IT Staff Agent',
        resolutionNotes
      );
      onTicketUpdated(updated);
      setShowResolveInput(false);
      if (addToast) addToast(`Status updated to ${newStatus}`, 'success');
      loadHistory();
    } catch (err) {
      if (addToast) addToast(`Error transitioning status: ${err.message}`, 'error');
    } finally {
      setTransitioning(false);
    }
  };

  const handleSyncServiceNow = async () => {
    try {
      setSyncingSN(true);
      const res = await api.syncTicketToServiceNow(ticket.id);
      onTicketUpdated(res.ticket);
      if (addToast) addToast(`Synced to ServiceNow (${res.servicenow_incident.number})`, 'success');
      loadHistory();
    } catch (err) {
      if (addToast) addToast(`ServiceNow sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingSN(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete incident ${ticket.id}?`)) return;
    try {
      await api.deleteTicket(ticket.id);
      onTicketDeleted(ticket.id);
      if (addToast) addToast(`Ticket ${ticket.id} deleted`, 'info');
      onClose();
    } catch (err) {
      if (addToast) addToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const getPriorityBadge = (prio) => {
    const p = (prio || 'Medium').toLowerCase();
    return <span className={`badge badge-${p}`}>{prio}</span>;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'New').toLowerCase().replace(' ', '-');
    return <span className={`badge badge-${s}`}>{status}</span>;
  };

  const getSLABadge = (slaStatus, remainingHours) => {
    const s = (slaStatus || 'Healthy').toLowerCase().replace(' ', '-');
    return <span className={`sla-badge sla-${s}`}>● {slaStatus} ({remainingHours}h remaining)</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840 }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--accent-cyan)'
            }}>
              {ticket.id}
            </span>
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
            {getSLABadge(ticket.sla_status, ticket.sla_remaining_hours)}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Title & Description */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
            {ticket.title}
          </h2>
          <div style={{
            background: 'var(--bg-input)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6
          }}>
            {ticket.description}
          </div>
        </div>

        {/* Workflow Action Bar */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '14px 18px',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          marginBottom: 20
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ITSM Lifecycle & Transition Workflow
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {ticket.status === 'New' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusTransition('Open')}
                disabled={transitioning}
              >
                Mark as Open
              </button>
            )}

            {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleStatusTransition('In Progress')}
                disabled={transitioning}
              >
                <span>Start Working (In Progress)</span>
              </button>
            )}

            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                    color: '#fff',
                    fontWeight: 600,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
                  }}
                  onClick={handle1ClickAutoResolve}
                  disabled={autoResolving}
                >
                  <AssistantIcon size={14} />
                  <span>{autoResolving ? 'Resolving...' : '⚡ 1-Click Auto-Resolve'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#059669', color: '#fff' }}
                  onClick={() => handleStatusTransition('Resolved')}
                  disabled={transitioning}
                >
                  <CheckIcon size={14} />
                  <span>Mark Resolved</span>
                </button>
              </>
            )}

            {ticket.status === 'Resolved' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusTransition('Closed')}
                disabled={transitioning}
              >
                Archive & Close
              </button>
            )}

            {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusTransition('In Progress')}
                disabled={transitioning}
              >
                Re-Open Incident
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSyncServiceNow}
              disabled={syncingSN}
              style={{ marginLeft: 'auto' }}
            >
              <ServiceNowIcon size={14} />
              <span>{ticket.servicenow_number ? `Sync to ${ticket.servicenow_number}` : 'Sync to ServiceNow'}</span>
            </button>
          </div>

          {showResolveInput && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Resolution note (e.g., Flushed DNS cache & verified VPN connection with user)"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStatusTransition('Resolved')}
                  disabled={transitioning}
                >
                  Confirm Resolution
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowResolveInput(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20
        }}>
          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Requester</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, color: 'var(--text-main)' }}>{ticket.requester}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dept: {ticket.department}</div>
          </div>

          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Assigned Agent</span>
              <button
                type="button"
                style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setIsEditingAssignee(!isEditingAssignee)}
              >
                {isEditingAssignee ? 'Cancel' : 'Reassign'}
              </button>
            </div>

            {isEditingAssignee ? (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  value={editTeam}
                  onChange={(e) => setEditTeam(e.target.value)}
                >
                  <option value="IT Service Desk">IT Service Desk</option>
                  <option value="Network Operations">Network Operations</option>
                  <option value="Desktop Support">Desktop Support</option>
                  <option value="Identity & Access">Identity & Access</option>
                  <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  <option value="IT Asset Management">IT Asset Management</option>
                  <option value="Security Operations">Security Operations</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  placeholder="Agent Name (e.g. Elena Rostova)"
                  value={editAgent}
                  onChange={(e) => setEditAgent(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 2, padding: '3px 8px', fontSize: '0.75rem' }}
                  disabled={savingAssignee}
                  onClick={handleSaveAssignee}
                >
                  {savingAssignee ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, color: 'var(--text-main)' }}>{ticket.assigned_agent || 'Unassigned'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team: {ticket.assigned_team}</div>
              </>
            )}
          </div>

          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>SLA Target</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, color: 'var(--text-main)' }}>
              {ticket.sla_target_hours} Hours Target
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Due: {new Date(ticket.sla_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>ServiceNow Status</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {ticket.servicenow_number || 'Not Linked'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {ticket.servicenow_sys_id ? `SysID: ${ticket.servicenow_sys_id.slice(0, 10)}...` : 'Use Sync button to export'}
            </div>
          </div>
        </div>

        {/* AI Classification & Reasoning Box */}
        {ticket.ai_classification && (
          <div className="ai-recommendation-box" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AssistantIcon size={16} />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent-cyan)' }}>
                  ITSM Copilot Classification & Reasoning
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Confidence: {Math.round((ticket.ai_classification.confidence || 0.94) * 100)}%
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: 10 }}>
              {ticket.ai_classification.reasoning}
            </p>

            {ticket.ai_classification.suggested_actions && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Recommended IT Actions:
                </div>
                <ul style={{ paddingLeft: 18, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {ticket.ai_classification.suggested_actions.map((act, idx) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AI Autonomous Root-Cause Diagnosis & Instant Resolution */}
        {loadingDiagnosis ? (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-color)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}>
            <RefreshIcon size={16} className="spin" />
            <span>Analyzing incident signals & matching approved IT Runbooks...</span>
          </div>
        ) : diagnosis && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.05), rgba(59, 130, 246, 0.03))',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 12,
            padding: 18,
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}>
                  AI DIAGNOSIS
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                  Root Cause & Auto-Resolution Engine
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontWeight: 600
                }}>
                  {Math.round((diagnosis.confidence || 0.95) * 100)}% Match
                </span>
                {diagnosis.matched_kb_id && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#a78bfa',
                    background: 'rgba(167, 139, 250, 0.1)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    fontWeight: 600
                  }}>
                    📖 {diagnosis.matched_kb_id}
                  </span>
                )}
              </div>
            </div>

            {/* Runbook Reference */}
            {diagnosis.matched_kb_title && (
              <div style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginBottom: 12,
                padding: '6px 10px',
                background: 'var(--bg-card)',
                borderRadius: 6,
                border: '1px solid var(--border-color)'
              }}>
                <strong style={{ color: 'var(--text-main)' }}>Verified Runbook: </strong>
                {diagnosis.matched_kb_title}
              </div>
            )}

            {/* Root Cause & Blast Radius Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div style={{
                background: 'var(--bg-card)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', marginBottom: 4 }}>
                  🔍 Identified Root Cause
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {diagnosis.root_cause}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 4 }}>
                  🌐 Blast Radius & Impact
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {diagnosis.blast_radius}
                </div>
              </div>
            </div>

            {/* Preventative Measure */}
            <div style={{
              background: 'var(--bg-card)',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              marginBottom: 14,
              fontSize: '0.82rem'
            }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>🛡️ Long-Term Prevention: </span>
              <span style={{ color: 'var(--text-main)' }}>{diagnosis.prevention_recommendation}</span>
            </div>

            {/* Remediation Checklist */}
            {diagnosis.checklist && diagnosis.checklist.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Remediation Verification Checklist:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {diagnosis.checklist.map((item, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: checkedSteps[idx] ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1px solid ${checkedSteps[idx] ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                        fontSize: '0.82rem',
                        color: checkedSteps[idx] ? '#34d399' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedSteps[idx]}
                        onChange={() => setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <span style={{ textDecoration: checkedSteps[idx] ? 'line-through' : 'none' }}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Structured Resolution Notes & 1-Click Resolve Action */}
            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.15)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(6, 182, 212, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    Generated Resolution Log (Synced to MongoDB Atlas & Audit Log):
                  </label>
                  <button
                    type="button"
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setResolutionNotes(diagnosis.suggested_resolution_notes)}
                  >
                    Reset to AI draft
                  </button>
                </div>
                <textarea
                  className="form-input"
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Resolution notes..."
                  style={{ width: '100%', fontSize: '0.82rem', marginBottom: 10 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '10px 16px',
                    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                  }}
                  onClick={handle1ClickAutoResolve}
                  disabled={autoResolving}
                >
                  <AssistantIcon size={16} />
                  <span>{autoResolving ? 'Auto-Resolving & Syncing to MongoDB Atlas...' : '🚀 1-Click Auto-Resolve Ticket (Write to MongoDB Atlas)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resolution Notes display if resolved */}
        {ticket.resolution_notes && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399', marginBottom: 4 }}>
              ✔ Verified Resolution Notes:
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
              {ticket.resolution_notes}
            </div>
          </div>
        )}

        {/* Activity Hub: Discussion & Work Notes vs Audit Trail */}
        <div style={{ marginTop: 24 }}>
          {/* Tab Selection Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 16
          }}>
            <button
              type="button"
              onClick={() => setActiveActivityTab('discussion')}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeActivityTab === 'discussion' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderBottom: activeActivityTab === 'discussion' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              💬 Discussion & Work Notes ({comments.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveActivityTab('audit')}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeActivityTab === 'audit' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderBottom: activeActivityTab === 'audit' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              📜 Audit History ({history.length})
            </button>
          </div>

          {/* TAB 1: DISCUSSION & WORK NOTES */}
          {activeActivityTab === 'discussion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Note Composer Box */}
              <div style={{
                background: isInternalNote ? 'rgba(245, 158, 11, 0.04)' : 'rgba(6, 182, 212, 0.04)',
                border: `1px solid ${isInternalNote ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                borderRadius: 10,
                padding: 14,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  {/* Type Selector Pills */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      style={{
                        background: isInternalNote ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card)',
                        color: isInternalNote ? '#f59e0b' : 'var(--text-muted)',
                        border: `1px solid ${isInternalNote ? '#f59e0b' : 'var(--border-color)'}`,
                        borderRadius: 20,
                        padding: '4px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🔒 Internal Work Note (IT Only)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      style={{
                        background: !isInternalNote ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-card)',
                        color: !isInternalNote ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        border: `1px solid ${!isInternalNote ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                        borderRadius: 20,
                        padding: '4px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      💬 Customer Reply (Public)
                    </button>
                  </div>

                  {/* Author Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Posting as:</span>
                    <input
                      type="text"
                      className="form-input"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '3px 8px', width: 140 }}
                    />
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  className="form-input"
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? "Add internal technical troubleshooting notes, diagnostic outputs, or private observations..."
                      : "Write public update or instructions for the requester..."
                  }
                  style={{ width: '100%', fontSize: '0.85rem', marginBottom: 10 }}
                />

                {/* Composer Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: isInternalNote ? '#f59e0b' : 'var(--accent-cyan)' }}>
                    {isInternalNote ? '🔒 Visible only to internal IT staff and administrators' : '💬 Visible to employee in self-service portal'}
                  </span>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{
                      background: isInternalNote
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : 'linear-gradient(135deg, #0284c7, #2563eb)'
                    }}
                    onClick={handleAddComment}
                    disabled={submittingComment || !commentText.trim()}
                  >
                    <span>{submittingComment ? 'Saving...' : isInternalNote ? 'Save Work Note' : 'Post Reply'}</span>
                  </button>
                </div>
              </div>

              {/* Comments Feed */}
              {loadingComments ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading discussion...</p>
              ) : comments.length === 0 ? (
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 8,
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  No notes or conversation logged yet. Use the composer above to add the first work note!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...comments].reverse().map((c) => {
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: c.is_internal ? 'rgba(245, 158, 11, 0.03)' : 'var(--bg-secondary)',
                          border: `1px solid ${c.is_internal ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-color)'}`,
                          borderLeft: `4px solid ${c.is_internal ? '#f59e0b' : 'var(--accent-cyan)'}`,
                          borderRadius: 8,
                          padding: '12px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: c.is_internal ? '#f59e0b' : 'var(--accent-cyan)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {(c.author || 'U')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              {c.author}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ({c.author_role})
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '1px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: c.is_internal ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                              color: c.is_internal ? '#f59e0b' : 'var(--accent-cyan)'
                            }}>
                              {c.is_internal ? '🔒 Internal Work Note' : '💬 Public Reply'}
                            </span>
                          </div>

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-main)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55,
                          paddingLeft: 34
                        }}>
                          {c.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHRONOLOGICAL AUDIT HISTORY */}
          {activeActivityTab === 'audit' && (
            <div>
              {loadingHistory ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading activity logs...</p>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No history records yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {h.action}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            by {h.actor}
                          </span>
                        </div>
                        {h.details && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {h.details}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444' }}
            onClick={handleDelete}
          >
            Delete Incident
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
