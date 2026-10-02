import React, { useState } from 'react';
import { SettingsIcon, CheckIcon, RefreshIcon } from './Icons';

export default function Settings({ addToast }) {
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoRouting, setAutoRouting] = useState(true);
  const [servicenowUrl, setServicenowUrl] = useState('https://enterprise-itsm.service-now.com');
  const [autoSyncSnow, setAutoSyncSnow] = useState(true);
  const [p1SlaHours, setP1SlaHours] = useState(4);
  const [p2SlaHours, setP2SlaHours] = useState(8);
  const [p3SlaHours, setP3SlaHours] = useState(24);
  const [p4SlaHours, setP4SlaHours] = useState(48);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    if (addToast) {
      addToast('Enterprise settings successfully updated!', 'success');
    }
  };

  return (
    <div className="settings-viewport">
      <form onSubmit={handleSave}>
        {/* AI Copilot & Triage Automation */}
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">ITSM Copilot & Autonomous Triage</h3>
              <p className="card-subheading">Configure RAG model sensitivity, confidence cutoffs, and automated escalation</p>
            </div>
            <span className="badge badge-open">Active Engine</span>
          </div>

          <div className="settings-field-group">
            <div className="settings-field">
              <label className="settings-label">
                <span>Auto-Classification Confidence Threshold</span>
                <span className="settings-value-hint">{confidenceThreshold}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="settings-range-slider"
              />
              <span className="settings-hint">
                Incidents scoring above {confidenceThreshold}% are automatically assigned without manual review.
              </span>
            </div>

            <div className="settings-toggle-row">
              <div>
                <div className="toggle-title">Autonomous Departmental Routing</div>
                <div className="toggle-desc">Automatically route tickets to IT Support, Network, or Identity teams based on AI diagnosis.</div>
              </div>
              <input
                type="checkbox"
                checked={autoRouting}
                onChange={(e) => setAutoRouting(e.target.checked)}
                className="settings-checkbox"
              />
            </div>
          </div>
        </div>

        {/* ServiceNow Connector Configuration */}
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">ServiceNow Table API Connector</h3>
              <p className="card-subheading">Instance connection endpoints, OAuth credentials, and synchronization rules</p>
            </div>
            <span className="badge badge-resolved">Connected</span>
          </div>

          <div className="settings-field-group">
            <div className="settings-field">
              <label className="settings-label">ServiceNow Instance URL</label>
              <input
                type="text"
                className="form-input"
                value={servicenowUrl}
                onChange={(e) => setServicenowUrl(e.target.value)}
              />
              <span className="settings-hint">Target endpoint: <code style={{ color: 'var(--accent-cyan)' }}>/api/now/table/incident</code></span>
            </div>

            <div className="settings-toggle-row">
              <div>
                <div className="toggle-title">Instant Bi-Directional Synchronization</div>
                <div className="toggle-desc">Trigger instant synchronization to ServiceNow upon incident creation and status changes.</div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncSnow}
                onChange={(e) => setAutoSyncSnow(e.target.checked)}
                className="settings-checkbox"
              />
            </div>
          </div>
        </div>

        {/* SLA Governance Targets */}
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">SLA Governance & Target Policies</h3>
              <p className="card-subheading">Define standard resolution target windows by severity tier</p>
            </div>
          </div>

          <div className="settings-grid-four">
            <div className="settings-field">
              <label className="settings-label">P1 Critical (Hours)</label>
              <input
                type="number"
                className="form-input"
                value={p1SlaHours}
                onChange={(e) => setP1SlaHours(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">P2 High (Hours)</label>
              <input
                type="number"
                className="form-input"
                value={p2SlaHours}
                onChange={(e) => setP2SlaHours(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">P3 Medium (Hours)</label>
              <input
                type="number"
                className="form-input"
                value={p3SlaHours}
                onChange={(e) => setP3SlaHours(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">P4 Low (Hours)</label>
              <input
                type="number"
                className="form-input"
                value={p4SlaHours}
                onChange={(e) => setP4SlaHours(Number(e.target.value))}
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="submit" className="btn btn-primary">
            <CheckIcon size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
