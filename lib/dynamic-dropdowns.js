const { jwtDecode } = require('jwt-decode');

/**
 * Dynamic Dropdown: Lista de Batches Recientes
 * Para usar en campos como batch_id
 */
const getBatchList = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.mailsafepro.es/jobs',
    method: 'GET',
    params: {
      limit: 50,
    },
    headers: {
      'Content-Type': 'application/json',
      ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
      ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
    },
  });

  if (response.status >= 400) {
    return [];
  }

  const batches = response.json?.jobs || [];

  return batches.map(batch => ({
    id: batch.job_id,
    name: `${batch.batch_name || 'Unnamed Batch'} (${batch.status}) - ${batch.total_emails} emails`,
  }));
};

/**
 * Dynamic Dropdown: Lista de Suppression Lists
 */
const getSuppressionLists = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.mailsafepro.es/suppression/lists',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
      ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
    },
  });

  if (response.status >= 400) {
    return [
      {
        id: 'default',
        name: 'Default Suppression List',
      },
    ];
  }

  const lists = response.json?.lists || [];

  return lists.map(list => ({
    id: list.list_id,
    name: `${list.name} (${list.total_emails} emails)`,
  }));
};

/**
 * Dynamic Dropdown: Prioridades de Procesamiento
 */
const getPriorityOptions = () => [
  { id: 'low', name: 'Low (Slow - up to 24h)' },
  { id: 'normal', name: 'Normal (Standard - up to 6h)' },
  { id: 'high', name: 'High (Fast - up to 1h, Enterprise only)' },
];

/**
 * Dynamic Dropdown: Filtros de Estado
 */
const getStatusFilters = () => [
  { id: 'all', name: 'All Statuses' },
  { id: 'valid', name: 'Valid Only' },
  { id: 'invalid', name: 'Invalid Only' },
  { id: 'risky', name: 'Risky Only' },
  { id: 'unknown', name: 'Unknown Only' },
];

/**
 * Dynamic Dropdown: Tipos de Spam Trap
 */
const getSpamTrapTypes = () => [
  { id: 'honeypot', name: 'Honeypot' },
  { id: 'spamtrap', name: 'Classic Spam Trap' },
  { id: 'pristine', name: 'Pristine Trap' },
  { id: 'recycled', name: 'Recycled Trap' },
  { id: 'role_based', name: 'Role-based Email' },
];

/**
 * Dynamic Dropdown: Motivos de Supresión
 */
const getSuppressionReasons = () => [
  { id: 'spam_trap', name: 'Spam Trap' },
  { id: 'bounce', name: 'Bounced Email' },
  { id: 'complaint', name: 'User Complaint' },
  { id: 'unsubscribe', name: 'Unsubscribe Request' },
  { id: 'disposable', name: 'Disposable Email' },
  { id: 'role_based', name: 'Role-based Email' },
  { id: 'invalid_format', name: 'Invalid Format' },
  { id: 'other', name: 'Other' },
];

module.exports = {
  getBatchList,
  getSuppressionLists,
  getPriorityOptions,
  getStatusFilters,
  getSpamTrapTypes,
  getSuppressionReasons,
};
