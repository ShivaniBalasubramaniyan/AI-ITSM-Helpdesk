import React from 'react';
import {
  TicketsIcon,
  CheckIcon,
  RefreshIcon,
  AssistantIcon,
  ServiceNowIcon,
  PlusIcon
} from './Icons';

export default function Dashboard({
  stats,
  tickets,
  onSelectTicket,
  onOpenCreate,
  onNavigateTab
}) {
  if (!stats) {
    return (
      <div className="dashboard-loading-state">
        <div className="loading-spinner" />
        <p>Loading enterprise IT operational telemetry...</p>
      </div>
    );
  }

  const recentTickets = (tickets || []).slice(0, 6);

  const getPriorityBadge = (prio) => {
    const p = (prio || 'Medium').toLowerCase();
    return <span className={`badge badge-${p}`}>{prio}</span>;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'New').toLowerCase().replace(' ', '-');
    return <span className={`badge badge-${s}`}>{status}</span>;
  };

  const getSLABadge = (slaStatus) => {
    const s = (slaStatus || 'Healthy').toLowerCase().replace(' ', '-');
    return <span className={`sla-badge sla-${s}`}>● {slaStatus}</span>;
  };

  return (
    <div className="dashboard-viewport">
      {/* Enterprise KPI Stat Grid */}
      <div className="dashboard-kpi-grid">
        {/* Open Tickets */}
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Open Tickets</span>
            <span className="kpi-icon-pill" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}>
              <TicketsIcon size={16} />
            </span>
          </div>
          <div className="kpi-number" style={{ color: '#38bdf8' }}>
            {stats.open_tickets}
          </div>
          <div className="kpi-footer-note">
            <span>Awaiting triage or review</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">In Progress</span>
            <span className="kpi-icon-pill" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
              <RefreshIcon size={16} />
            </span>
          </div>
          <div className="kpi-number" style={{ color: '#f59e0b' }}>
            {stats.in_progress_tickets}
          </div>
          <div className="kpi-footer-note">
            <span>Active engineering tasks</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Resolved</span>
            <span className="kpi-icon-pill" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
              <CheckIcon size={16} />
            </span>
          </div>
          <div className="kpi-number" style={{ color: '#10b981' }}>
            {stats.resolved_tickets + (stats.closed_tickets || 0)}
          </div>
          <div className="kpi-footer-note">
            <span>Remediated successfully</span>
          </div>
        </div>

        {/* Critical */}
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">Critical (P1)</span>
            <span className="kpi-icon-pill" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
              !
            </span>
          </div>
          <div className="kpi-number" style={{ color: '#ef4444' }}>
            {stats.critical_tickets || stats.critical_and_high || 0}
          </div>
          <div className="kpi-footer-note">
            <span>Immediate response required</span>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="glass-card kpi-stat-card">
          <div className="kpi-top">
            <span className="kpi-title">SLA Compliance</span>
            <span className="kpi-icon-pill" style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)' }}>
              %
            </span>
          </div>
          <div className="kpi-number" style={{ color: '#6366f1' }}>
            {stats.sla_compliance_rate}%
          </div>
          <div className="kpi-footer-note">
            <span>Target threshold &gt; 95%</span>
          </div>
        </div>
      </div>

      {/* Middle Operations Matrix: SLA Health & Category Distribution */}
      <div className="dashboard-grid-two">
        {/* SLA Health Monitor */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">SLA Health Overview</h3>
              <p className="card-subheading">Active incident SLA status tracking across all priority levels</p>
            </div>
            <span className="badge badge-open">Dynamic Engine</span>
          </div>

          <div className="sla-monitor-bars">
            <div className="sla-row">
              <div className="sla-row-info">
                <span className="sla-label"><span className="sla-dot healthy" /> Healthy (Within Target)</span>
                <span className="sla-count">{stats.sla_breakdown?.Healthy || 0} tickets</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill healthy"
                  style={{ width: `${((stats.sla_breakdown?.Healthy || 0) / (stats.total_tickets || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="sla-row">
              <div className="sla-row-info">
                <span className="sla-label"><span className="sla-dot at-risk" /> At Risk (&lt;25% SLA remaining)</span>
                <span className="sla-count">{stats.sla_breakdown?.['At Risk'] || 0} tickets</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill at-risk"
                  style={{ width: `${((stats.sla_breakdown?.['At Risk'] || 0) / (stats.total_tickets || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="sla-row">
              <div className="sla-row-info">
                <span className="sla-label"><span className="sla-dot breached" /> Breached (Exceeded Target)</span>
                <span className="sla-count">{stats.sla_breakdown?.Breached || 0} tickets</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill breached"
                  style={{ width: `${((stats.sla_breakdown?.Breached || 0) / (stats.total_tickets || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="sla-row">
              <div className="sla-row-info">
                <span className="sla-label"><span className="sla-dot met" /> Met (Resolved on Time)</span>
                <span className="sla-count">{stats.sla_breakdown?.Met || 0} tickets</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill met"
                  style={{ width: `${((stats.sla_breakdown?.Met || 0) / (stats.total_tickets || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-heading">Category Distribution</h3>
              <p className="card-subheading">AI classification breakdown by enterprise domain</p>
            </div>
            <span className="badge badge-new">Auto-Triage</span>
          </div>

          <div className="category-bars-list">
            {Object.entries(stats.category_distribution || {}).map(([cat, count]) => {
              const pct = Math.round((count / (stats.total_tickets || 1)) * 100);
              return (
                <div key={cat} className="category-bar-row">
                  <div className="cat-info">
                    <span className="cat-name">{cat}</span>
                    <span className="cat-meta">{count} incidents ({pct}%)</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill category-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="glass-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-heading">Recent Incidents & Triage Log</h3>
            <p className="card-subheading">Select any row to view complete AI diagnostic context and resolution workflow</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('tickets')}
          >
            <span>View All ({stats.total_tickets}) →</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title & Requester</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA Health</th>
                <th>ServiceNow Link</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                    No recent incidents logged.
                  </td>
                </tr>
              ) : (
                recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="clickable-row"
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {t.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {t.requester} • {t.department}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category}</span>
                    </td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td>{getSLABadge(t.sla_status)}</td>
                    <td>
                      {t.servicenow_number ? (
                        <span className="snow-link-pill">
                          {t.servicenow_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Unlinked</span>
                      )}
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
