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

  useEffect(() => {
    if (ticket?.id) {
      loadHistory();
    }
  }, [ticket?.id]);

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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Assigned Agent</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: 2, color: 'var(--text-main)' }}>{ticket.assigned_agent}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team: {ticket.assigned_team}</div>
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

        {/* Audit Trail History */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-main)' }}>
            Chronological Audit History ({history.length})
          </h3>

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
