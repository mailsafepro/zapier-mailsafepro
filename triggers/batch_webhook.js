/**
 * @module BatchWebhookTrigger
 * @description Webhook trigger para recibir notificaciones cuando un batch de validación se completa.
 * Permite automatizar flujos de trabajo basados en resultados de validación batch.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const batchWebhookTrigger = {
  key: 'batch_complete_webhook',
  noun: 'Batch Completado',
  display: {
    label: '🔔 Batch Validation Complete (Webhook)',
    description:
      'Triggers when a batch email validation completes. Ideal for automating result processing workflows.',
  },

  operation: {
    type: 'hook',

    inputFields: [
      {
        key: 'filter_status',
        type: 'string',
        required: false,
        label: '🎯 Filtrar por Estado',
        helpText: 'Solo recibir notificaciones para batches con este estado',
        choices: {
          all: '📊 Todos los estados',
          completed: '✅ Solo completados exitosamente',
          partial: '⚠️ Solo completados parcialmente',
          failed: '❌ Solo fallidos',
        },
        default: 'all',
      },
      {
        key: 'min_emails',
        type: 'integer',
        required: false,
        label: '📧 Mínimo de Emails',
        helpText: 'Solo notificar si el batch tiene al menos este número de emails',
        default: '1',
      },
      {
        key: 'include_results_summary',
        type: 'boolean',
        required: false,
        label: '📊 Incluir Resumen de Resultados',
        helpText: 'Incluir estadísticas resumidas de los resultados en la notificación',
        default: 'true',
      },
    ],

    // Subscribe: Registrar el webhook en MailSafePro
    performSubscribe: async (z, bundle) => {
      const response = await z.request({
        url: 'https://api.mailsafepro.com/v1/webhooks',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zapier-MailSafePro/2.0.0',
          ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
          ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
        },
        body: {
          target_url: bundle.targetUrl,
          event_type: 'batch.completed',
          filters: {
            status: bundle.inputData.filter_status || 'all',
            min_emails: bundle.inputData.min_emails || 1,
          },
          options: {
            include_results_summary: bundle.inputData.include_results_summary !== false,
          },
          metadata: {
            source: 'zapier',
            zap_id: bundle.meta?.zap?.id || 'unknown',
          },
        },
        timeout: 15000,
      });

      if (response.status >= 400) {
        const errorDetail = response.json?.detail || 'Error al registrar webhook';
        throw new z.errors.Error(errorDetail, 'WEBHOOK_SUBSCRIBE_ERROR', response.status);
      }

      return response.json;
    },

    // Unsubscribe: Eliminar el webhook de MailSafePro
    performUnsubscribe: async (z, bundle) => {
      const webhookId = bundle.subscribeData?.id || bundle.subscribeData?.webhook_id;

      if (!webhookId) {
        z.console.warn('No webhook ID found for unsubscribe');
        return { success: true, message: 'No webhook to unsubscribe' };
      }

      const response = await z.request({
        url: `https://api.mailsafepro.com/v1/webhooks/${webhookId}`,
        method: 'DELETE',
        headers: {
          'User-Agent': 'Zapier-MailSafePro/2.0.0',
          ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
          ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
        },
        timeout: 10000,
      });

      if (response.status >= 400 && response.status !== 404) {
        z.console.error('Error unsubscribing webhook:', response.json);
      }

      return { success: true, webhook_id: webhookId };
    },

    // Perform: Procesar el payload del webhook entrante
    perform: async (z, bundle) => {
      const payload = bundle.cleanedRequest;

      // Validar que el payload tenga la estructura esperada
      if (!payload || !payload.job_id) {
        z.console.warn('Invalid webhook payload received:', payload);
        return [];
      }

      // Enriquecer el payload con información adicional
      const enrichedPayload = {
        ...payload,
        received_at: new Date().toISOString(),
        webhook_source: 'mailsafepro',

        // Calcular métricas adicionales si hay resultados
        ...(payload.results_summary && {
          success_rate:
            payload.results_summary.total > 0
              ? ((payload.results_summary.valid / payload.results_summary.total) * 100).toFixed(2)
              : 0,
          risk_rate:
            payload.results_summary.total > 0
              ? ((payload.results_summary.risky / payload.results_summary.total) * 100).toFixed(2)
              : 0,
          invalid_rate:
            payload.results_summary.total > 0
              ? ((payload.results_summary.invalid / payload.results_summary.total) * 100).toFixed(2)
              : 0,
        }),

        // URLs de acción
        action_urls: {
          view_results: `https://api.mailsafepro.com/v1/validate/batch/${payload.job_id}/results`,
          download_csv: `https://api.mailsafepro.com/v1/validate/batch/${payload.job_id}/export?format=csv`,
          download_json: `https://api.mailsafepro.com/v1/validate/batch/${payload.job_id}/export?format=json`,
        },
      };

      return [enrichedPayload];
    },

    // PerformList: Obtener batches recientes para testing
    performList: async (z, bundle) => {
      const response = await z.request({
        url: 'https://api.mailsafepro.com/v1/validate/batch/history',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zapier-MailSafePro/2.0.0',
          ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
          ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
        },
        params: {
          limit: 5,
          status: 'completed',
        },
        timeout: 15000,
      });

      if (response.status >= 400) {
        // Si no hay historial, devolver sample data
        return [
          {
            job_id: 'batch_sample_123456',
            status: 'completed',
            batch_name: 'Sample Batch',
            total_emails: 100,
            completed_at: new Date().toISOString(),
            results_summary: {
              total: 100,
              valid: 85,
              invalid: 10,
              risky: 5,
            },
            success_rate: '85.00',
            risk_rate: '5.00',
            invalid_rate: '10.00',
            received_at: new Date().toISOString(),
            webhook_source: 'mailsafepro',
            action_urls: {
              view_results:
                'https://api.mailsafepro.com/v1/validate/batch/batch_sample_123456/results',
              download_csv:
                'https://api.mailsafepro.com/v1/validate/batch/batch_sample_123456/export?format=csv',
              download_json:
                'https://api.mailsafepro.com/v1/validate/batch/batch_sample_123456/export?format=json',
            },
          },
        ];
      }

      const batches = response.json?.batches || response.json || [];

      return batches.map(batch => ({
        ...batch,
        received_at: batch.completed_at || new Date().toISOString(),
        webhook_source: 'mailsafepro',
        success_rate:
          batch.results_summary?.total > 0
            ? ((batch.results_summary.valid / batch.results_summary.total) * 100).toFixed(2)
            : '0',
        action_urls: {
          view_results: `https://api.mailsafepro.com/v1/validate/batch/${batch.job_id}/results`,
          download_csv: `https://api.mailsafepro.com/v1/validate/batch/${batch.job_id}/export?format=csv`,
          download_json: `https://api.mailsafepro.com/v1/validate/batch/${batch.job_id}/export?format=json`,
        },
      }));
    },

    sample: {
      job_id: 'batch_550e8400-e29b-41d4-a716-446655440000',
      status: 'completed',
      batch_name: 'Lista de leads - Q1 2024',
      total_emails: 500,
      processing_time_seconds: 245,
      started_at: '2024-01-15T10:00:00.000Z',
      completed_at: '2024-01-15T10:04:05.000Z',
      results_summary: {
        total: 500,
        valid: 425,
        invalid: 50,
        risky: 20,
        unknown: 5,
      },
      success_rate: '85.00',
      risk_rate: '4.00',
      invalid_rate: '10.00',
      received_at: '2024-01-15T10:04:06.000Z',
      webhook_source: 'mailsafepro',
      action_urls: {
        view_results:
          'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/results',
        download_csv:
          'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/export?format=csv',
        download_json:
          'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/export?format=json',
      },
    },

    outputFields: [
      { key: 'job_id', label: '🆔 ID del Batch', type: 'string' },
      { key: 'status', label: '📊 Estado Final', type: 'string' },
      { key: 'batch_name', label: '🏷️ Nombre del Batch', type: 'string' },
      { key: 'total_emails', label: '📧 Total de Emails', type: 'integer' },
      { key: 'processing_time_seconds', label: '⏱️ Tiempo de Procesamiento (seg)', type: 'number' },
      { key: 'started_at', label: '🚀 Inicio del Procesamiento', type: 'datetime' },
      { key: 'completed_at', label: '✅ Fin del Procesamiento', type: 'datetime' },
      { key: 'results_summary__total', label: '📊 Total Procesados', type: 'integer' },
      { key: 'results_summary__valid', label: '✅ Emails Válidos', type: 'integer' },
      { key: 'results_summary__invalid', label: '❌ Emails Inválidos', type: 'integer' },
      { key: 'results_summary__risky', label: '⚠️ Emails Riesgosos', type: 'integer' },
      { key: 'results_summary__unknown', label: '❓ Emails Desconocidos', type: 'integer' },
      { key: 'success_rate', label: '📈 Tasa de Éxito (%)', type: 'string' },
      { key: 'risk_rate', label: '⚠️ Tasa de Riesgo (%)', type: 'string' },
      { key: 'invalid_rate', label: '❌ Tasa de Inválidos (%)', type: 'string' },
      { key: 'received_at', label: '📅 Fecha de Recepción', type: 'datetime' },
      { key: 'action_urls__view_results', label: '🔗 URL de Resultados', type: 'string' },
      { key: 'action_urls__download_csv', label: '📥 Descargar CSV', type: 'string' },
      { key: 'action_urls__download_json', label: '📥 Descargar JSON', type: 'string' },
    ],
  },
};

module.exports = batchWebhookTrigger;
