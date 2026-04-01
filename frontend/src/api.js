import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8001';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ── Core ──────────────────────────────────────────────────────────────────────
export const checkDuplicate = (record) => api.post('/check-duplicate', record);
export const getGoldenRecords = (params) => api.get('/golden-records', { params });
export const getGoldenRecord = (id) => api.get(`/golden-record/${id}`);
export const approveMerge = (data) => api.post('/approve-merge', data);
export const rejectMerge = (data) => api.post('/reject-merge', data);
export const splitRecord = (data) => api.post('/split-record', data);
export const getCandidatePairs = (params) => api.get('/candidate-pairs', { params });
export const getAuditTrail = (params) => api.get('/audit-trail', { params });
export const getIdentityGraph = () => api.get('/identity-graph');
export const getEntityTimeline = (id) => api.get(`/entity-timeline/${id}`);
export const getDecayReport = () => api.get('/decay-report');
export const getFeedbackStats = () => api.get('/feedback-stats');
export const getDashboardStats = () => api.get('/dashboard-stats');
export const runQuery = (data) => api.post('/query', data);

// ── Golden Record Breakdown ───────────────────────────────────────────────────
export const deleteEntity = (patientId) => api.delete(`/delete-entity/${patientId}`);
export const getBusinessImpact = () => api.get('/business-impact');
export const getRbacRoles = () => api.get('/rbac-roles');
export const getGoldenRecordBreakdown = (id) => api.get(`/api/golden-record-breakdown/${id}`);

// ── Ingestion ─────────────────────────────────────────────────────────────────
export const ingestFolder = () => api.post('/ingest/folder');
export const ingestSingleRecord = (record) => api.post('/api/ingest/record', { record });
export const ingestBatch = (records) => api.post('/api/ingest/batch', { records });
export const getIngestionStatus = () => api.get('/api/ingestion/status');
export const getIngestionLog = (limit = 50) => api.get(`/api/ingestion/log?limit=${limit}`);
export const ingestCSVUpload = (formData) => api.post('/api/ingest/csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const ingestUpload = (formData) => api.post('/ingest/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// ── Privacy & Compliance ──────────────────────────────────────────────────────
export const unmaskField = (data) => api.post('/api/unmask', data);
export const getComplianceStatus = () => api.get('/api/compliance');

// ── Intelligence ──────────────────────────────────────────────────────────────
export const getAnomalies = () => api.get('/api/anomalies');
export const getDuplicateIQ = () => api.get('/api/duplicate-iq');
export const getSourceHealth = () => api.get('/api/source-health');
export const getMergeImpact = (patientId) => api.get(`/api/merge-impact/${patientId}`);
export const getEntityRelationships = () => api.get('/api/entity-relationships');
export const getQualitySLA = () => api.get('/api/quality-sla');

// ── Export ────────────────────────────────────────────────────────────────────
export const exportGoldenRecords = () =>
  api.get('/api/export/golden-records', { responseType: 'blob' });

// ── WebSocket URLs ────────────────────────────────────────────────────────────
export const WS_URL = 'ws://127.0.0.1:8001/ws/engine-log';
export const WS_LIVE_FEED_URL = 'ws://127.0.0.1:8001/ws/live-feed';

export default api;
