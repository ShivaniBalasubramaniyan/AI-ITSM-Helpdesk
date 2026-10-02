import React, { useState } from 'react';
import { api } from '../api';
import { BrandLogo, AssistantIcon, CloseIcon, PlusIcon } from './Icons';

export default function CreateTicketModal({ onClose, onTicketCreated, addToast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requester, setRequester] = useState('Alex Morgan');
  const [department, setDepartment] = useState('Engineering');
  const [category, setCategory] = useState('Software');
  const [priority, setPriority] = useState('Medium');
  const [urgency, setUrgency] = useState('Medium');
  const [assignedTeam, setAssignedTeam] = useState('IT Service Desk');

  const [aiClassification, setAiClassification] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAIClassify = async () => {
    if (!title.trim() && !description.trim()) {
      if (addToast) addToast('Please enter a title or description first.', 'error');
      return;
    }

    try {
      setClassifying(true);
      const result = await api.classifyTicket(
        title || 'Untitled IT Incident',
        description || title
      );
      setAiClassification(result);
      setCategory(result.category);
      setPriority(result.priority);
      setUrgency(result.urgency);
      setAssignedTeam(result.suggested_team);
      if (addToast) addToast(`AI Auto-Classified: ${result.category} (${result.priority})`, 'success');
    } catch (err) {
      if (addToast) addToast(`Classification error: ${err.message}`, 'error');
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      if (addToast) addToast('Please fill in both title and description.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        requester,
        department,
        category,
        priority,
        urgency,
        impact: urgency,
        assigned_team: assignedTeam,
        ai_classification: aiClassification
      };

      const created = await api.createTicket(payload);
      if (addToast) addToast(`Incident ${created.id} logged successfully!`, 'success');
      onTicketCreated(created);
      onClose();
    } catch (err) {
      if (addToast) addToast(`Failed to create ticket: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Log New IT Service Incident
            </h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Incident Subject / Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cisco AnyConnect VPN Certificate Expired on macOS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>Detailed Symptoms & Impact *</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAIClassify}
                disabled={classifying}
              >
                <AssistantIcon size={14} />
                <span>{classifying ? 'Analyzing Patterns...' : 'Run AI Auto-Classify'}</span>
              </button>
            </div>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Describe what occurred, steps to reproduce, error codes, and who is affected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* AI Recommendation Glow Banner */}
          {aiClassification && (
            <div className="ai-recommendation-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AssistantIcon size={14} /> ITSM Copilot Recommendation
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 12
                }}>
                  {Math.round(aiClassification.confidence * 100)}% Confidence
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: 8 }}>
                {aiClassification.reasoning}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target Team: <strong style={{ color: 'var(--text-main)' }}>{aiClassification.suggested_team}</strong> • Suggested Priority: <strong style={{ color: 'var(--text-main)' }}>{aiClassification.priority}</strong>
              </div>
            </div>
          )}

          {/* Requester & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Requester Full Name</label>
              <input
                type="text"
                className="form-input"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department / Unit</label>
              <select
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="Engineering">Engineering</option>
                <option value="Product Engineering">Product Engineering</option>
                <option value="Data Engineering">Data Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Workplace Services">Workplace Services</option>
              </select>
            </div>
          </div>

          {/* Category, Priority, Urgency Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">IT Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Network">Network</option>
                <option value="Access & Identity">Access & Identity</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Email & Collaboration">Email & Collaboration</option>
                <option value="Security">Security</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority (SLA Target)</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Critical">Critical (2h SLA)</option>
                <option value="High">High (4h SLA)</option>
                <option value="Medium">Medium (8h SLA)</option>
                <option value="Low">Low (24h SLA)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency</label>
              <select
                className="form-select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="High">High Urgency</option>
                <option value="Medium">Medium Urgency</option>
                <option value="Low">Low Urgency</option>
              </select>
            </div>
          </div>

          {/* Routing Target Team */}
          <div className="form-group">
            <label className="form-label">Assignment Group / Team</label>
            <input
              type="text"
              className="form-input"
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <PlusIcon size={14} />
              <span>{submitting ? 'Registering...' : 'Submit Incident'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
