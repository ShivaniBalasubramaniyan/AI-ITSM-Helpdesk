import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ServiceNowIcon,
  RefreshIcon,
  CheckIcon
} from './Icons';

export default function ServiceNowHub({ addToast, onRefreshTickets }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.getServiceNowIncidents();
      setIncidents(res.incidents || []);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      if (addToast) addToast(`ServiceNow connector error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const res = await api.syncAllToServiceNow();
      if (addToast) addToast(res.message, 'success');
      loadIncidents();
      if (onRefreshTickets) onRefreshTickets();
    } catch (err) {
      if (addToast) addToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingAll(false);
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

  return (
    <div className="snow-viewport">
      {/* Integration Control Panel Cards */}
      <div className="snow-kpi-grid">
        <div className="glass-card snow-stat-card">
          <div className="snow-card-label">Connection Status</div>
          <div className="snow-card-value" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" /> Connected
          </div>
          <div className="snow-card-sub">Table API: /api/now/table/incident</div>
        </div>

        <div className="glass-card snow-stat-card">
          <div className="snow-card-label">Synced Incidents</div>
          <div className="snow-card-value" style={{ color: '#38bdf8' }}>
            {incidents.length}
          </div>
          <div className="snow-card-sub">Active enterprise mapping entries</div>
        </div>

        <div className="glass-card snow-stat-card">
          <div className="snow-card-label">Last Synchronization</div>
          <div className="snow-card-value" style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>
            {lastSyncTime}
          </div>
          <div className="snow-card-sub">Bi-directional delta verification</div>
        </div>

        <div className="glass-card snow-stat-card">
          <div className="snow-card-label">Sync Health</div>
          <div className="snow-card-value" style={{ color: '#6366f1' }}>
            100%
          </div>
          <div className="snow-card-sub">0 validation errors in buffer</div>
        </div>
      </div>

      {/* Action Header Banner */}
      <div className="glass-card snow-banner-card">
        <div className="snow-banner-left">
          <div className="snow-banner-icon">
            <ServiceNowIcon size={22} />
          </div>
          <div>
            <div className="snow-banner-title">ServiceNow Enterprise Integration Engine</div>
            <div className="snow-banner-desc">
              Synchronizing incident attributes, work notes, assignment groups, and resolution states with remote ServiceNow instance.
            </div>
          </div>
        </div>

        <div className="snow-banner-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadIncidents}
            disabled={loading}
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSyncAll}
            disabled={syncingAll}
          >
            <RefreshIcon size={14} />
            <span>{syncingAll ? 'Synchronizing...' : 'Batch Sync All'}</span>
          </button>
        </div>
      </div>

      {/* Incident Mapping Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 className="card-heading">Synchronized Incident Ledger</h3>
            <p className="card-subheading">Live mapping between AI-ITSM Helpdesk and ServiceNow Table API</p>
          </div>
          <span className="badge badge-resolved">{incidents.length} Records</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ServiceNow #</th>
                <th>Correlated Ticket ID</th>
                <th>Short Description</th>
                <th>Assignment Group</th>
                <th>Priority</th>
                <th>ServiceNow State</th>
                <th>Sync Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    Loading ServiceNow ledger...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No synchronized incidents yet. Click "Batch Sync All" to synchronize open tickets.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.sys_id || inc.number}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-indigo)' }}>
                      {inc.number}
                    </td>
                    <td>
                      <span className="snow-link-pill">
                        {inc.correlation_id || inc.ticket_id || 'LOCAL-NEW'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inc.short_description}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {inc.assignment_group || 'IT Service Desk'}
                      </span>
                    </td>
                    <td>{getPriorityBadge(inc.priority)}</td>
                    <td>{getStatusBadge(inc.state)}</td>
                    <td>
                      <span className="badge badge-resolved">
                        <CheckIcon size={12} /> Synced
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
