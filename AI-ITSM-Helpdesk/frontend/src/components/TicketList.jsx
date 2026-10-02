import React, { useState } from 'react';
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  RefreshIcon
} from './Icons';

export default function TicketList({
  tickets,
  filters,
  setFilters,
  onSelectTicket,
  onOpenCreate,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm });
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
    let label = slaStatus;
    if (slaStatus === 'Healthy' || slaStatus === 'At Risk') {
      label = `${slaStatus} (${remainingHours}h left)`;
    }
    return <span className={`sla-badge sla-${s}`}>● {label}</span>;
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      search: '',
      status: 'All',
      priority: 'All',
      category: 'All',
      assignee: 'All',
      sla: 'All'
    });
  };

  const isFiltered =
    filters.search ||
    filters.status !== 'All' ||
    filters.priority !== 'All' ||
    filters.category !== 'All' ||
    (filters.assignee && filters.assignee !== 'All') ||
    (filters.sla && filters.sla !== 'All');

  // Client-side filtering for extra fields if needed
  const displayTickets = (tickets || []).filter((t) => {
    if (filters.assignee && filters.assignee !== 'All') {
      const team = (t.assigned_team || '').toLowerCase();
      const agent = (t.assigned_agent || '').toLowerCase();
      const filterAss = filters.assignee.toLowerCase();
      if (!team.includes(filterAss) && !agent.includes(filterAss)) return false;
    }
    if (filters.sla && filters.sla !== 'All') {
      if ((t.sla_status || '').toLowerCase() !== filters.sla.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div className="ticket-list-viewport">
      {/* Top Filter & Query Bar */}
      <div className="glass-card filter-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="filter-form-layout">
          {/* Search Input */}
          <div className="filter-search-box">
            <SearchIcon size={16} className="filter-search-icon" />
            <input
              type="text"
              className="form-input search-input-padded"
              placeholder="Search by ticket ID, title, description, or requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Selects */}
          <div className="filter-controls-row">
            {/* Status Filter */}
            <select
              className="form-select"
              value={filters.status || 'All'}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              title="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              className="form-select"
              value={filters.priority || 'All'}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              title="Filter by priority"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical (P1)</option>
              <option value="High">High (P2)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="Low">Low (P4)</option>
            </select>

            {/* Category Filter */}
            <select
              className="form-select"
              value={filters.category || 'All'}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              title="Filter by category"
            >
              <option value="All">All Categories</option>
              <option value="Network">Network</option>
              <option value="Access & Identity">Access & Identity</option>
              <option value="Software">Software</option>
              <option value="Hardware">Hardware</option>
              <option value="Email & Collaboration">Email & Collaboration</option>
              <option value="Security">Security</option>
            </select>

            {/* Assignee Filter */}
            <select
              className="form-select"
              value={filters.assignee || 'All'}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              title="Filter by assigned team"
            >
              <option value="All">All Assignees</option>
              <option value="Service Desk">IT Service Desk</option>
              <option value="Network">Network Team</option>
              <option value="Security">Security Ops</option>
              <option value="Hardware">End User Computing</option>
            </select>

            {/* SLA Filter */}
            <select
              className="form-select"
              value={filters.sla || 'All'}
              onChange={(e) => setFilters({ ...filters, sla: e.target.value })}
              title="Filter by SLA state"
            >
              <option value="All">All SLA States</option>
              <option value="Healthy">Healthy</option>
              <option value="At Risk">At Risk</option>
              <option value="Breached">Breached</option>
              <option value="Met">Met</option>
            </select>

            <button type="submit" className="btn btn-secondary btn-sm">
              <FilterIcon size={14} />
              <span>Apply</span>
            </button>

            {isFiltered && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetFilters}
                title="Reset all filters"
              >
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Enterprise Ticket Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title & Requester</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>SLA Countdown</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    Loading incidents...
                  </td>
                </tr>
              ) : displayTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No matching incidents found matching your query criteria.
                  </td>
                </tr>
              ) : (
                displayTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="clickable-row"
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {t.id}
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {t.requester} • {t.department}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category}</span>
                    </td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        {t.assigned_agent || 'Unassigned'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {t.assigned_team}
                      </div>
                    </td>
                    <td>{getSLABadge(t.sla_status, t.sla_remaining_hours)}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Today'}
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
