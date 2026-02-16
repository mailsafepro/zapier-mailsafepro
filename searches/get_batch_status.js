/**
 * @module GetBatchStatusSearch
 * @description Search para consultar el estado de un batch de validación en progreso.
 * Permite monitorear el progreso y obtener estimaciones de tiempo restante.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const getBatchStatusSearch = {
  key: 'get_batch_status',
  noun: 'Estado de Batch',
  display: {
    label: 'Get Batch Status',
    description:
      'Get the current status of a batch validation, including progress, estimated time, and partial metrics.',
  },

  operation: {
    inputFields: [
      {
        key: 'job_id',
        type: 'string',
        required: true,
        label: 'Batch ID',
        helpText: 'The unique identifier of the batch validation (obtained when creating the batch)',
        dynamic: 'batch_list_dropdown.id.name',
      },
      {
        key: 'include_partial_results',
        type: 'boolean',
        required: false,
        default: 'false',
        label: 'Include Partial Results',
        helpText: 'Include statistics for emails already processed',
      },
    ],

    perform: async (z, bundle) => {
      const { job_id, include_partial_results } = bundle.inputData;

      if (!job_id || !job_id.trim()) {
        throw new z.errors.Error('El ID del batch es requerido', 'MISSING_JOB_ID');
      }

      const cleanJobId = job_id.trim();

      try {
        const response = await z.request({
          url: `https://api.mailsafepro.es/jobs/${cleanJobId}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          params: {
            include_partial: include_partial_results ? 'true' : 'false',
          },
          timeout: 15000,
          skipThrowForStatus: true,
        });

        switch (response.status) {
          case 200:
            break;
          case 400:
            throw new z.errors.Error(
              'ID de batch inválido. Verifique el formato.',
              'INVALID_JOB_ID'
            );
          case 401:
            throw new z.errors.Error(
              'Autenticación inválida. Verifique sus credenciales.',
              'AUTHENTICATION_FAILED'
            );
          case 403:
            throw new z.errors.Error('No tiene permisos para ver este batch.', 'FORBIDDEN');
          case 404:
            throw new z.errors.Error(
              `Batch no encontrado: ${cleanJobId}. Verifique el ID.`,
              'BATCH_NOT_FOUND'
            );
          case 429:
            throw new z.errors.RateLimitError(
              'Límite de consultas excedido. Espere antes de consultar nuevamente.'
            );
          default:
            throw new z.errors.Error(`Error del servidor: ${response.status}`, 'SERVER_ERROR');
        }

        const statusData = response.json;

        if (!statusData || typeof statusData !== 'object') {
          throw new z.errors.Error('Respuesta inválida del servidor', 'INVALID_RESPONSE');
        }

        // Calcular métricas adicionales
        const enrichedStatus = {
          ...statusData,
          queried_at: new Date().toISOString(),

          // Progreso calculado
          progress_percentage:
            statusData.total_emails > 0
              ? ((statusData.processed_emails / statusData.total_emails) * 100).toFixed(2)
              : 0,

          // Estado legible
          status_display: getStatusDisplay(statusData.status),
          is_complete: ['completed', 'failed', 'cancelled'].includes(statusData.status),
          is_processing: statusData.status === 'processing',
          is_queued: statusData.status === 'queued',

          // Tiempo estimado
          ...(statusData.estimated_completion && {
            time_remaining_seconds: Math.max(
              0,
              Math.floor((new Date(statusData.estimated_completion) - new Date()) / 1000)
            ),
            time_remaining_display: formatTimeRemaining(
              new Date(statusData.estimated_completion) - new Date()
            ),
          }),

          // URLs de acción
          action_urls: {
            view_results:
              statusData.status === 'completed'
                ? `https://api.mailsafepro.es/jobs/${cleanJobId}/results`
                : null,
            cancel_batch: ['queued', 'processing'].includes(statusData.status)
              ? `https://api.mailsafepro.es/jobs/${cleanJobId}/cancel`
              : null,
          },

          // Recomendación de polling
          recommended_next_poll: getRecommendedPollInterval(statusData.status),
        };

        return [enrichedStatus];
      } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            'Timeout al consultar estado. El servicio puede estar ocupado.',
            'STATUS_QUERY_TIMEOUT'
          );
        }
        if (error.code === 'ECONNREFUSED') {
          throw new z.errors.Error(
            'No se puede conectar al servicio. Verifique su conexión.',
            'SERVICE_UNREACHABLE'
          );
        }
        throw error;
      }
    },

    sample: {
      job_id: 'batch_550e8400-e29b-41d4-a716-446655440000',
      status: 'processing',
      status_display: 'Procesando',
      batch_name: 'Lista de leads - Q1 2024',
      total_emails: 500,
      processed_emails: 250,
      progress_percentage: '50.00',
      is_complete: false,
      is_processing: true,
      is_queued: false,
      started_at: '2024-01-15T10:00:00.000Z',
      estimated_completion: '2024-01-15T10:08:00.000Z',
      time_remaining_seconds: 240,
      time_remaining_display: '4 minutos',
      queried_at: '2024-01-15T10:04:00.000Z',
      partial_results: {
        valid: 200,
        invalid: 30,
        risky: 15,
        unknown: 5,
      },
      queue_position: null,
      priority: 'normal',
      action_urls: {
        view_results: null,
        cancel_batch:
          'https://api.mailsafepro.es/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/cancel',
      },
      recommended_next_poll: 30,
    },

    outputFields: [
      { key: 'job_id', label: 'ID del Batch', type: 'string' },
      { key: 'status', label: 'Estado', type: 'string' },
      { key: 'status_display', label: 'Estado (Display)', type: 'string' },
      { key: 'batch_name', label: 'Nombre del Batch', type: 'string' },
      { key: 'total_emails', label: 'Total de Emails', type: 'integer' },
      { key: 'processed_emails', label: 'Emails Procesados', type: 'integer' },
      { key: 'progress_percentage', label: 'Progreso (%)', type: 'string' },
      { key: 'is_complete', label: 'Completado', type: 'boolean' },
      { key: 'is_processing', label: 'En Proceso', type: 'boolean' },
      { key: 'is_queued', label: 'En Cola', type: 'boolean' },
      { key: 'started_at', label: 'Inicio', type: 'datetime' },
      { key: 'estimated_completion', label: 'Finalización Estimada', type: 'datetime' },
      { key: 'time_remaining_seconds', label: 'Tiempo Restante (seg)', type: 'integer' },
      { key: 'time_remaining_display', label: 'Tiempo Restante', type: 'string' },
      { key: 'queried_at', label: 'Fecha de Consulta', type: 'datetime' },
      { key: 'partial_results__valid', label: 'Válidos (Parcial)', type: 'integer' },
      { key: 'partial_results__invalid', label: 'Inválidos (Parcial)', type: 'integer' },
      { key: 'partial_results__risky', label: 'Riesgosos (Parcial)', type: 'integer' },
      { key: 'queue_position', label: 'Posición en Cola', type: 'integer' },
      { key: 'priority', label: 'Prioridad', type: 'string' },
      { key: 'action_urls__view_results', label: 'URL de Resultados', type: 'string' },
      { key: 'action_urls__cancel_batch', label: 'URL para Cancelar', type: 'string' },
      { key: 'recommended_next_poll', label: 'Próximo Poll (seg)', type: 'integer' },
    ],
  },
};

// Funciones auxiliares
function getStatusDisplay(status) {
  const displays = {
    queued: 'En Cola',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Fallido',
    cancelled: 'Cancelado',
    partial: 'Parcialmente Completado',
  };
  return displays[status] || status;
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Completando...';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hora${hours > 1 ? 's' : ''} ${minutes % 60} min`;
  }
  if (minutes > 0) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
}

function getRecommendedPollInterval(status) {
  const intervals = {
    queued: 60, // 1 minuto si está en cola
    processing: 30, // 30 segundos si está procesando
    completed: 0, // No necesita polling
    failed: 0,
    cancelled: 0,
  };
  return intervals[status] || 30;
}

module.exports = getBatchStatusSearch;
