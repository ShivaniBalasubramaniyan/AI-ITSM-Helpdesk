import React, { useState, useRef } from 'react';
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  RefreshIcon,
  DownloadIcon,
  TrashIcon,
  CheckIcon,
  MicIcon
} from './Icons';
import { api } from '../api';

const AVAILABLE_TEAMS = [
  'IT Service Desk',
  'Network Operations',
  'Desktop Support',
  'Identity & Access',
  'Cloud Infrastructure',
  'IT Asset Management',
  'Security Operations'
];

export default function TicketList({
  tickets = [],
  filters,
  setFilters,
  onSelectTicket,
  onOpenCreate,
  onTicketsChanged,
  addToast,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [activePreset, setActivePreset] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [reassigningId, setReassigningId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (addToast) addToast('Voice search is not supported on this browser (use Chrome or Edge).', 'warning');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
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
        if (addToast) addToast('🎙️ Listening... Speak search query', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setFilters((prev) => ({ ...prev, search: transcript }));
        setIsListening(false);
        if (addToast) addToast(`Filtering by: "${transcript}"`, 'success');
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
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Compute preset filter counts
  const totalCount = tickets.length;
  const slaRiskCount = tickets.filter(
    (t) => t.sla_status === 'At Risk' || t.sla_status === 'Breached'
  ).length;
  const criticalHighCount = tickets.filter(
    (t) => t.priority === 'Critical' || t.priority === 'High'
  ).length;
  const activeCount = tickets.filter(
    (t) => t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === 'Resolved' || t.status === 'Closed'
  ).length;

  // Search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchTerm });
  };

  // Filter application including presets
  const displayTickets = tickets.filter((t) => {
    // Presets
    if (activePreset === 'sla_risk') {
      if (t.sla_status !== 'At Risk' && t.sla_status !== 'Breached') return false;
    } else if (activePreset === 'critical') {
      if (t.priority !== 'Critical' && t.priority !== 'High') return false;
    } else if (activePreset === 'active') {
      if (t.status === 'Resolved' || t.status === 'Closed') return false;
    } else if (activePreset === 'resolved') {
      if (t.status !== 'Resolved' && t.status !== 'Closed') return false;
    }

    // Assignee filter
    if (filters.assignee && filters.assignee !== 'All') {
      const team = (t.assigned_team || '').toLowerCase();
      const agent = (t.assigned_agent || '').toLowerCase();
      const filterAss = filters.assignee.toLowerCase();
      if (!team.includes(filterAss) && !agent.includes(filterAss)) return false;
    }

    // SLA filter
    if (filters.sla && filters.sla !== 'All') {
      if ((t.sla_status || '').toLowerCase() !== filters.sla.toLowerCase()) return false;
    }

    return true;
  });

  // Checkbox Selection
  const allSelected =
    displayTickets.length > 0 &&
    displayTickets.every((t) => selectedIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayTickets.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Operations
  const handleBulkStatus = async (status) => {
    if (!selectedIds.length) return;
    try {
      setBulkProcessing(true);
      await api.bulkTicketAction({
        ticket_ids: selectedIds,
        action: 'status',
        status
      });
      if (addToast) addToast(`Updated ${selectedIds.length} tickets to ${status}`, 'success');
      setSelectedIds([]);
      if (onTicketsChanged) onTicketsChanged();
    } catch (err) {
      if (addToast) addToast(`Bulk action failed: ${err.message}`, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkPriority = async (priority) => {
    if (!selectedIds.length) return;
    try {
      setBulkProcessing(true);
      await api.bulkTicketAction({
        ticket_ids: selectedIds,
        action: 'priority',
        priority
      });
      if (addToast) addToast(`Updated ${selectedIds.length} tickets to priority ${priority}`, 'success');
      setSelectedIds([]);
      if (onTicketsChanged) onTicketsChanged();
    } catch (err) {
      if (addToast) addToast(`Bulk priority failed: ${err.message}`, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReassign = async (team) => {
    if (!selectedIds.length || !team) return;
    try {
      setBulkProcessing(true);
      await api.bulkTicketAction({
        ticket_ids: selectedIds,
        action: 'reassign',
        assigned_team: team
      });
      if (addToast) addToast(`Reassigned ${selectedIds.length} tickets to ${team}`, 'success');
      setSelectedIds([]);
      if (onTicketsChanged) onTicketsChanged();
    } catch (err) {
      if (addToast) addToast(`Bulk reassign failed: ${err.message}`, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected tickets?`)) {
      return;
    }
    try {
      setBulkProcessing(true);
      await api.bulkTicketAction({
        ticket_ids: selectedIds,
        action: 'delete'
      });
      if (addToast) addToast(`Deleted ${selectedIds.length} tickets`, 'info');
      setSelectedIds([]);
      if (onTicketsChanged) onTicketsChanged();
    } catch (err) {
      if (addToast) addToast(`Bulk delete failed: ${err.message}`, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Inline single ticket quick reassignment
  const handleInlineReassign = async (ticketId, newTeam, e) => {
    e.stopPropagation();
    try {
      setReassigningId(ticketId);
      await api.updateTicket(ticketId, {
        assigned_team: newTeam,
        actor: 'IT Dispatcher'
      });
      if (addToast) addToast(`${ticketId} reassigned to ${newTeam}`, 'success');
      if (onTicketsChanged) onTicketsChanged();
    } catch (err) {
      if (addToast) addToast(`Reassignment failed: ${err.message}`, 'error');
    } finally {
      setReassigningId(null);
    }
  };

  const handleExportCSV = () => {
    api.exportTicketsCSV(filters);
    if (addToast) addToast('Exporting incident dataset to CSV...', 'info');
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
    setActivePreset('all');
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
    activePreset !== 'all' ||
    (filters.assignee && filters.assignee !== 'All') ||
    (filters.sla && filters.sla !== 'All');

  return (
    <div className="ticket-list-viewport">
      {/* Top Header Title & Actions Strip */}
      <div className="ticket-list-header-strip">
        <div>
          <h1 className="page-main-heading">Service Desk & Incidents</h1>
          <p className="page-sub-heading">
            Live tickets powered by MongoDB Cloud Atlas. Manage, filter, bulk update, and reassign support queues.
          </p>
        </div>

        <div className="ticket-header-actions-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            title="Download CSV report of current incidents"
          >
            <DownloadIcon size={14} />
            <span>Export CSV</span>
          </button>

          {onOpenCreate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreate}
            >
              <PlusIcon size={14} />
              <span>Create Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Quick-Filter Pills */}
      <div className="ticket-presets-bar">
        <button
          type="button"
          className={`ticket-preset-pill ${activePreset === 'all' ? 'active' : ''}`}
          onClick={() => setActivePreset('all')}
        >
          <span>All Incidents</span>
          <span className="preset-count-badge">{totalCount}</span>
        </button>

        <button
          type="button"
          className={`ticket-preset-pill sla-risk-pill ${activePreset === 'sla_risk' ? 'active' : ''}`}
          onClick={() => setActivePreset('sla_risk')}
        >
          <span>⚠️ SLA At Risk & Breached</span>
          <span className="preset-count-badge danger-count">{slaRiskCount}</span>
        </button>

        <button
          type="button"
          className={`ticket-preset-pill ${activePreset === 'critical' ? 'active' : ''}`}
          onClick={() => setActivePreset('critical')}
        >
          <span>🔥 Critical & High (P1/P2)</span>
          <span className="preset-count-badge warning-count">{criticalHighCount}</span>
        </button>

        <button
          type="button"
          className={`ticket-preset-pill ${activePreset === 'active' ? 'active' : ''}`}
          onClick={() => setActivePreset('active')}
        >
          <span>⏳ Active (Open / In Progress)</span>
          <span className="preset-count-badge">{activeCount}</span>
        </button>

        <button
          type="button"
          className={`ticket-preset-pill ${activePreset === 'resolved' ? 'active' : ''}`}
          onClick={() => setActivePreset('resolved')}
        >
          <span>✅ Resolved & Closed</span>
          <span className="preset-count-badge success-count">{resolvedCount}</span>
        </button>
      </div>

      {/* Query & Filter Toolbar */}
      <div className="glass-card filter-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="filter-form-layout">
          {/* Search Input */}
          <div className="filter-search-box" style={{ position: 'relative' }}>
            <SearchIcon size={16} className="filter-search-icon" />
            <input
              type="text"
              className="form-input search-input-padded"
              placeholder="Search by ticket ID, title, description, or requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={toggleVoiceSearch}
              title={isListening ? 'Listening... click to stop' : 'Voice Search (Speech-to-Text)'}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: isListening ? '#ef4444' : 'transparent',
                color: isListening ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isListening ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none'
              }}
            >
              <MicIcon size={14} />
            </button>
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
              <option value="Network">Network Operations</option>
              <option value="Security">Security Operations</option>
              <option value="Desktop">Desktop Support</option>
              <option value="Identity">Identity & Access</option>
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

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-floating-bar animate-fade-in">
          <div className="bulk-selection-count">
            <span className="bulk-count-badge">{selectedIds.length}</span>
            <span>incidents selected</span>
          </div>

          <div className="bulk-action-controls">
            {/* Bulk Status Select */}
            <select
              className="form-select bulk-select"
              defaultValue=""
              disabled={bulkProcessing}
              onChange={(e) => {
                if (e.target.value) handleBulkStatus(e.target.value);
              }}
            >
              <option value="" disabled>Change Status...</option>
              <option value="Open">Set Open</option>
              <option value="In Progress">Set In Progress</option>
              <option value="Resolved">Set Resolved</option>
              <option value="Closed">Set Closed</option>
            </select>

            {/* Bulk Priority Select */}
            <select
              className="form-select bulk-select"
              defaultValue=""
              disabled={bulkProcessing}
              onChange={(e) => {
                if (e.target.value) handleBulkPriority(e.target.value);
              }}
            >
              <option value="" disabled>Change Priority...</option>
              <option value="Critical">Critical (P1)</option>
              <option value="High">High (P2)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="Low">Low (P4)</option>
            </select>

            {/* Bulk Reassign Team */}
            <select
              className="form-select bulk-select"
              defaultValue=""
              disabled={bulkProcessing}
              onChange={(e) => {
                if (e.target.value) handleBulkReassign(e.target.value);
              }}
            >
              <option value="" disabled>Reassign Team...</option>
              {AVAILABLE_TEAMS.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>

            {/* Bulk Delete */}
            <button
              type="button"
              className="btn btn-sm btn-danger-soft"
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              title="Delete selected tickets"
            >
              <TrashIcon size={14} />
              <span>Delete</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={bulkProcessing}
              onClick={() => setSelectedIds([])}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Enterprise Ticket Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="custom-table-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Select all visible tickets"
                  />
                </th>
                <th style={{ width: 110 }}>Ticket ID</th>
                <th>Title & Requester</th>
                <th style={{ width: 140 }}>Category</th>
                <th style={{ width: 110 }}>Priority</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 190 }}>Assignee & Team</th>
                <th style={{ width: 170 }}>SLA Countdown</th>
                <th style={{ width: 110 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                    Loading incidents from MongoDB Cloud Atlas...
                  </td>
                </tr>
              ) : displayTickets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    No matching incidents found matching your query criteria.
                  </td>
                </tr>
              ) : (
                displayTickets.map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className={`clickable-row ${isChecked ? 'row-selected-highlight' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td
                        style={{ textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="custom-table-checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectOne(t.id, e)}
                        />
                      </td>

                      {/* Ticket ID */}
                      <td>
                        <span className="ticket-id-badge">{t.id}</span>
                      </td>

                      {/* Title & Requester */}
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          {t.requester} • <span style={{ color: 'var(--text-muted)' }}>{t.department}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category}</span>
                      </td>

                      {/* Priority */}
                      <td>{getPriorityBadge(t.priority)}</td>

                      {/* Status */}
                      <td>{getStatusBadge(t.status)}</td>

                      {/* Inline Reassignment Column */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            {t.assigned_agent || 'Unassigned'}
                          </div>
                          
                          {/* Quick Team Reassignment Dropdown */}
                          <select
                            className="inline-team-select"
                            value={t.assigned_team || 'IT Service Desk'}
                            disabled={reassigningId === t.id}
                            title="Click to reassign team"
                            onChange={(e) => handleInlineReassign(t.id, e.target.value, e)}
                          >
                            {AVAILABLE_TEAMS.map((team) => (
                              <option key={team} value={team}>{team}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* SLA */}
                      <td>{getSLABadge(t.sla_status, t.sla_remaining_hours)}</td>

                      {/* Created Date */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Today'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
