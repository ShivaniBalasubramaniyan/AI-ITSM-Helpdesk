/**
 * API Client for AI-ITSM Helpdesk Automation Platform
 * Handles all REST endpoints with automatic JSON parsing and error handling.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => request('/api/health'),
  getDashboardStats: () => request('/api/dashboard/stats'),
  
  getTickets: (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status && filters.status !== 'All') query.append('status', filters.status);
    if (filters.priority && filters.priority !== 'All') query.append('priority', filters.priority);
    if (filters.category && filters.category !== 'All') query.append('category', filters.category);
    const qs = query.toString();
    return request(`/api/tickets${qs ? `?${qs}` : ''}`);
  },

  getTicket: (id) => request(`/api/tickets/${id}`),
  
  createTicket: (payload) => request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  updateTicket: (id, payload) => request(`/api/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  deleteTicket: (id) => request(`/api/tickets/${id}`, {
    method: 'DELETE'
  }),

  getTicketHistory: (id) => request(`/api/tickets/${id}/history`),

  transitionTicket: (id, status, actor = 'IT Staff', resolutionNotes = '') => request(`/api/tickets/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ status, actor, resolution_notes: resolutionNotes })
  }),

  classifyTicket: (title, description) => request('/api/ai/classify', {
    method: 'POST',
    body: JSON.stringify({ title, description })
  }),

  askAIAssistant: (message, history = []) => request('/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  }),

  getKnowledgeArticles: (category = null, search = null) => {
    const query = new URLSearchParams();
    if (category && category !== 'All') query.append('category', category);
    if (search) query.append('search', search);
    const qs = query.toString();
    return request(`/api/knowledge${qs ? `?${qs}` : ''}`);
  },

  getKnowledgeArticle: (id) => request(`/api/knowledge/${id}`),

  submitKBFeedback: (id, helpful) => request(`/api/knowledge/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ helpful })
  }),

  getServiceNowIncidents: () => request('/api/servicenow/incidents'),

  syncTicketToServiceNow: (ticketId) => request(`/api/servicenow/sync/${ticketId}`, {
    method: 'POST'
  }),

  syncAllToServiceNow: () => request('/api/servicenow/sync-all', {
    method: 'POST'
  })
};
