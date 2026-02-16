/**
 * @module CancelBatchCreate
 * @description Acción para cancelar un batch de validación en progreso.
 * Útil para detener validaciones que ya no son necesarias.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const cancelBatchCreate = {
  key: 'cancel_batch',
  noun: 'Cancelar Batch',
  display: {
    label: 'Cancel Batch Validation',
    description:
      'Cancel a batch validation that is queued or in progress. Already processed emails are preserved.',
  },

  operation: {
    inputFields: [
      {
        key: 'job_id',
        type: 'string',
        required: true,
        label: 'Batch ID',
        helpText: 'The unique identifier of the batch to cancel',
        placeholder: 'batch_550e8400-e29b-41d4-a716-446655440000',
        dynamic: 'batch_list_dropdown.id.name',
      },
      {
        key: 'reason',
        type: 'string',
        required: false,
        label: 'Cancellation Reason',
        helpText: 'Optional reason for cancelling the batch (for audit purposes)',
        placeholder: 'Email list updated, no longer needed',
      },
      {
        key: 'preserve_partial_results',
        type: 'boolean',
        required: false,
        default: 'true',
        label: 'Preserve Partial Results',
        helpText: 'Keep results for emails already processed',
      },
    ],

    perform: async (z, bundle) => {
      const { job_id, reason, preserve_partial_results = true } = bundle.inputData;

      if (!job_id || !job_id.trim()) {
        throw new z.errors.Error('El ID del batch es requerido', 'MISSING_JOB_ID');
      }

      const cleanJobId = job_id.trim();

      try {
        const response = await z.request({
          url: `https://api.mailsafepro.es/jobs/${cleanJobId}/cancel`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          body: {
            reason: reason || 'Cancelled via Zapier',
            preserve_partial_results,
          },
          timeout: 15000,
        });

        switch (response.status) {
          case 200:
          case 202:
            break;
          case 400:
            throw new z.errors.Error(
              'ID de batch inválido o el batch no puede ser cancelado.',
              'INVALID_REQUEST'
            );
          case 401:
            throw new z.errors.Error(
              'Autenticación inválida. Verifique sus credenciales.',
              'AUTHENTICATION_FAILED'
            );
          case 403:
            throw new z.errors.Error('No tiene permisos para cancelar este batch.', 'FORBIDDEN');
          case 404:
            throw new z.errors.Error(
              `Batch no encontrado: ${cleanJobId}. Verifique el ID.`,
              'BATCH_NOT_FOUND'
            );
          case 409:
            throw new z.errors.Error(
              'El batch ya está completado o cancelado y no puede ser cancelado.',
              'BATCH_ALREADY_FINISHED'
            );
          case 429:
            throw new z.errors.RateLimitError(
              'Límite de solicitudes excedido. Espere antes de intentar nuevamente.'
            );
          default:
            throw new z.errors.Error(`Error del servidor: ${response.status}`, 'SERVER_ERROR');
        }

        const cancelData = response.json;

        // Enriquecer la respuesta
        const enrichedResult = {
          ...cancelData,
          job_id: cleanJobId,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancelled via Zapier',
          partial_results_preserved: preserve_partial_results,

          // Estado final
          final_status: 'cancelled',
          status_display: 'Cancelado',

          // Información de resultados parciales si existen
          ...(cancelData.partial_results && {
            partial_summary: {
              processed: cancelData.partial_results.processed || 0,
              valid: cancelData.partial_results.valid || 0,
              invalid: cancelData.partial_results.invalid || 0,
              risky: cancelData.partial_results.risky || 0,
            },
          }),

          // URLs de acción
          action_urls: {
            view_partial_results: preserve_partial_results
              ? `https://api.mailsafepro.es/jobs/${cleanJobId}/results`
              : null,
            create_new_batch: 'https://api.mailsafepro.es/jobs',
          },
        };

        return enrichedResult;
      } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            'Timeout al cancelar batch. El servicio puede estar ocupado.',
            'CANCEL_TIMEOUT'
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
      cancelled_at: '2024-01-15T10:05:00.000Z',
      cancellation_reason: 'Lista de emails actualizada',
      partial_results_preserved: true,
      final_status: 'cancelled',
      status_display: 'Cancelado',
      original_total_emails: 500,
      processed_before_cancel: 250,
      partial_summary: {
        processed: 250,
        valid: 200,
        invalid: 30,
        risky: 20,
      },
      action_urls: {
        view_partial_results:
          'https://api.mailsafepro.es/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/results',
        create_new_batch: 'https://api.mailsafepro.es/validate/batch',
      },
    },

    outputFields: [
      { key: 'job_id', label: 'ID del Batch', type: 'string' },
      { key: 'cancelled_at', label: 'Fecha de Cancelación', type: 'datetime' },
      { key: 'cancellation_reason', label: 'Motivo', type: 'string' },
      { key: 'partial_results_preserved', label: 'Resultados Preservados', type: 'boolean' },
      { key: 'final_status', label: 'Estado Final', type: 'string' },
      { key: 'status_display', label: 'Estado (Display)', type: 'string' },
      { key: 'original_total_emails', label: 'Total Original', type: 'integer' },
      { key: 'processed_before_cancel', label: 'Procesados Antes de Cancelar', type: 'integer' },
      { key: 'partial_summary__processed', label: 'Procesados (Parcial)', type: 'integer' },
      { key: 'partial_summary__valid', label: 'Válidos (Parcial)', type: 'integer' },
      { key: 'partial_summary__invalid', label: 'Inválidos (Parcial)', type: 'integer' },
      { key: 'partial_summary__risky', label: 'Riesgosos (Parcial)', type: 'integer' },
      {
        key: 'action_urls__view_partial_results',
        label: 'Ver Resultados Parciales',
        type: 'string',
      },
      { key: 'action_urls__create_new_batch', label: 'Crear Nuevo Batch', type: 'string' },
    ],
  },
};

module.exports = cancelBatchCreate;
