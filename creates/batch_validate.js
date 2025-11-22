/**
 * Sistema Completo de Validación Batch para MailSafePro
 * Incluye envío, monitoreo y recuperación de resultados con métricas avanzadas
 */

const batchValidateCreate = {
  key: 'batch_validate_enterprise',
  noun: 'Validación Batch Avanzada',
  display: {
    label: '📊 Validación Batch Avanzada',
    description:
      'Valida lotes grandes de emails con seguimiento en tiempo real, métricas detalladas y múltiples formatos de entrada.',
  },
  operation: {
    inputFields: [
      {
        key: 'input_method',
        type: 'string',
        required: true,
        label: '📥 Método de Entrada',
        helpText: 'Seleccione cómo proporcionar los emails para validación',
        choices: {
          text_list: '📝 Lista de textos (emails separados por comas)',
          file_url: '🔗 URL de archivo remoto',
          direct_emails: '👥 Array de emails directo',
        },
        default: 'text_list',
        altersDynamicFields: true,
      },
      {
        key: 'emails',
        type: 'string',
        required: false,
        label: '📧 Lista de Emails',
        helpText:
          'Emails separados por comas, puntos y coma o saltos de línea. Máximo 1000 emails por lote.',
        placeholder: 'usuario1@ejemplo.com, usuario2@dominio.com, usuario3@test.org',
        // Se elimina dependsOn pues no está permitido en v18
        // La lógica dependiente se deberá manejar manualmente desde altersDynamicFields o en la función perform
      },
      {
        key: 'email_array',
        type: 'string',
        list: true,
        required: false,
        label: '👥 Array de Emails Directos',
        helpText: 'Lista directa de emails para validación batch',
        placeholder: 'usuario@ejemplo.com',
        // Same as above: removed dependsOn
      },
      {
        key: 'file_url',
        type: 'string',
        required: false,
        label: '🔗 URL de Archivo',
        helpText:
          'URL a archivo CSV, TXT o ZIP con lista de emails. Formatos soportados: .csv, .txt, .zip',
        placeholder: 'https://ejemplo.com/lista-emails.csv',
        // Removed dependsOn
      },
      {
        key: 'file_column',
        type: 'string',
        required: false,
        label: '📋 Columna de Emails (CSV)',
        helpText:
          'Nombre de la columna que contiene los emails en archivos CSV. Si está vacío, se detecta automáticamente.',
        placeholder: 'email, correo, contact_email',
        // Removed dependsOn
      },
      {
        key: 'check_smtp',
        type: 'boolean',
        required: false,
        default: false,
        label: '🔄 Verificación SMTP Avanzada',
        helpText: 'Verificación de existencia real de buzones (requiere plan PREMIUM o ENTERPRISE)',
      },
      {
        key: 'include_raw_dns',
        type: 'boolean',
        required: false,
        default: false,
        label: '🔍 Registros DNS Completos',
        helpText: 'Incluir registros SPF, DKIM y DMARC completos en los resultados',
      },
      {
        key: 'priority',
        type: 'string',
        required: false,
        default: 'normal',
        label: '🎯 Prioridad de Procesamiento',
        helpText: 'Velocidad de procesamiento del batch (ENTERPRISE solo para alta prioridad)',
        choices: {
          low: '🐢 Baja (hasta 24 horas)',
          normal: '🚶 Normal (hasta 6 horas)',
          high: '🚀 Alta (hasta 1 hora - ENTERPRISE only)',
        },
      },
      {
        key: 'callback_url',
        type: 'string',
        required: false,
        label: '📞 URL de Callback',
        helpText: 'URL para notificación cuando el batch esté completo (Webhook)',
        placeholder: 'https://tu-dominio.com/webhook/batch-complete',
      },
      {
        key: 'batch_name',
        type: 'string',
        required: false,
        label: '🏷️ Nombre del Lote',
        helpText: 'Nombre identificativo para este batch de validación',
        placeholder: 'Lista de clientes - Noviembre 2024',
      },
    ],

    perform: async (z, bundle) => {
      const {
        input_method,
        emails,
        file_url,
        file_column,
        email_array,
        check_smtp,
        include_raw_dns,
        priority,
        callback_url,
        batch_name,
      } = bundle.inputData;

      if (!input_method) {
        throw new z.errors.Error('El método de entrada es requerido', 'INPUT_METHOD_REQUIRED');
      }

      let processedEmails = [];
      let totalEmails = 0;

      switch (input_method) {
        case 'text_list':
          if (!emails || !emails.trim()) {
            throw new z.errors.Error('La lista de emails no puede estar vacía', 'EMPTY_EMAIL_LIST');
          }
          processedEmails = emails
            .split(/[,;\n]/)
            .map(email => email.trim())
            .filter(email => {
              if (!email) return false;
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(email);
            });
          if (processedEmails.length === 0) {
            throw new z.errors.Error(
              'No se encontraron emails válidos en la lista proporcionada',
              'NO_VALID_EMAILS_FOUND'
            );
          }
          if (processedEmails.length > 1000) {
            throw new z.errors.Error(
              `Límite excedido: ${processedEmails.length} emails (máximo 1000 por lote)`,
              'BATCH_SIZE_EXCEEDED'
            );
          }
          break;

        case 'direct_emails':
          if (!email_array || !Array.isArray(email_array) || email_array.length === 0) {
            throw new z.errors.Error(
              'El array de emails no puede estar vacío',
              'EMPTY_EMAIL_ARRAY'
            );
          }
          processedEmails = email_array
            .map(email => email.trim())
            .filter(email => {
              if (!email) return false;
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(email);
            });
          if (processedEmails.length === 0) {
            throw new z.errors.Error(
              'No se encontraron emails válidos en el array',
              'NO_VALID_EMAILS_IN_ARRAY'
            );
          }
          break;

        case 'file_url':
          if (!file_url || !file_url.trim()) {
            throw new z.errors.Error('La URL del archivo es requerida', 'FILE_URL_REQUIRED');
          }
          try {
            const url = new URL(file_url);
            if (!['http:', 'https:'].includes(url.protocol)) {
              throw new z.errors.Error(
                'Solo se permiten URLs HTTP y HTTPS',
                'INVALID_URL_PROTOCOL'
              );
            }
          } catch {
            throw new z.errors.Error('URL de archivo inválida', 'INVALID_FILE_URL');
          }
          break;

        default:
          throw new z.errors.Error(
            `Método de entrada no soportado: ${input_method}`,
            'UNSUPPORTED_INPUT_METHOD'
          );
      }

      const payload = {
        check_smtp: !!check_smtp,
        include_raw_dns: !!include_raw_dns,
        priority: priority || 'normal',
        ...(callback_url && { callback_url }),
        ...(batch_name && { batch_name }),
      };

      if (input_method === 'text_list' || input_method === 'direct_emails') {
        payload.emails = processedEmails;
        totalEmails = processedEmails.length;
      } else if (input_method === 'file_url') {
        payload.file_url = file_url;
        if (file_column) {
          payload.column = file_column;
        }
        totalEmails = 100; // Valor estimado para batch con archivo
      }

      let response;
      try {
        response = await z.request({
          url: 'https://api.mailsafepro.com/v1/validate/batch',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-Batch-Integration/2.0.0',
            'X-Client-Version': '2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          body: JSON.stringify(payload),
          timeout: 45000,
        });
      } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            'Timeout en la conexión con el servicio de validación. Intente con una prioridad más baja o un lote más pequeño.',
            'CONNECTION_TIMEOUT'
          );
        }
        if (error.code === 'ECONNREFUSED') {
          throw new z.errors.Error(
            'No se puede conectar al servicio de validación. Verifique su conexión a internet.',
            'SERVICE_UNREACHABLE'
          );
        }
        throw new z.errors.Error(`Error de red: ${error.message}`, 'NETWORK_ERROR');
      }

      switch (response.status) {
        case 200:
        case 201:
        case 202:
          break;
        case 400:
          throw new z.errors.Error(
            'Solicitud mal formada. Verifique los parámetros y formatos.',
            'BAD_REQUEST'
          );
        case 401:
          throw new z.errors.Error(
            'Autenticación inválida o expirada. Verifique sus credenciales.',
            'AUTHENTICATION_FAILED'
          );
        case 403: {
          const errorDetail = response.json?.detail || '';
          if (
            errorDetail.includes('plan') ||
            errorDetail.includes('PREMIUM') ||
            errorDetail.includes('ENTERPRISE')
          ) {
            throw new z.errors.Error(
              'Esta funcionalidad requiere un plan superior. Actualice su plan para acceder a validación batch avanzada.',
              'PLAN_UPGRADE_REQUIRED'
            );
          }
          throw new z.errors.Error(
            'Acceso denegado. No tiene permisos para esta operación.',
            'FORBIDDEN'
          );
        }
        case 413:
          throw new z.errors.Error(
            'El lote es demasiado grande. Reduzca el número de emails o use un archivo.',
            'PAYLOAD_TOO_LARGE'
          );
        case 429: {
          const retryAfter = response.headers['retry-after'] || '60';
          throw new z.errors.RateLimitError(
            `Límite de tasa excedido. Por favor espere ${retryAfter} segundos antes de intentar otro lote.`,
            'RATE_LIMIT_EXCEEDED'
          );
        }
        case 500:
        case 502:
        case 503: {
          const serverErrorDetail =
            response.json?.detail ||
            'El servicio de validación está temporalmente no disponible. Intente nuevamente en unos minutos.';
          throw new z.errors.Error(serverErrorDetail, 'SERVICE_UNAVAILABLE');
        }
        default:
          throw new z.errors.Error(
            `Error inesperado del servidor: ${response.status} - ${
              response.json?.detail || 'Contacte soporte'
            }`,
            'SERVER_ERROR'
          );
      }

      const result = response.json;

      if (!result || typeof result !== 'object') {
        throw new z.errors.Error(
          'Respuesta inválida del servidor de validación',
          'INVALID_SERVER_RESPONSE'
        );
      }

      if (!result.job_id) {
        throw new z.errors.Error(
          'La respuesta del servidor no incluye ID de trabajo',
          'MISSING_JOB_ID'
        );
      }

      const enrichedResult = {
        ...result,
        submitted_at: new Date().toISOString(),
        estimated_completion_time: calculateEstimatedCompletion(totalEmails, priority, check_smtp),
        input_method,
        total_emails_estimated: totalEmails,
        validation_options: {
          check_smtp,
          include_raw_dns,
          priority,
        },
        tracking_url: `https://api.mailsafepro.com/v1/validate/batch/${result.job_id}/status`,
        results_url: `https://api.mailsafepro.com/v1/validate/batch/${result.job_id}/results`,
        can_poll_status: true,
        recommended_poll_interval: getPollInterval(priority),
        ...(callback_url && { callback_url }),
        ...(batch_name && { batch_name }),
      };

      return [enrichedResult];
    },

    sample: {
      job_id: 'batch_550e8400-e29b-41d4-a716-446655440000',
      status: 'processing',
      submitted_at: '2024-01-15T10:30:00.000Z',
      estimated_completion_time: '2024-01-15T10:45:00.000Z',
      input_method: 'text_list',
      total_emails_estimated: 150,
      validation_options: {
        check_smtp: true,
        include_raw_dns: false,
        priority: 'normal',
      },
      tracking_url:
        'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/status',
      results_url:
        'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/results',
      can_poll_status: true,
      recommended_poll_interval: 300,
      batch_name: 'Lista de leads - Q1 2024',
      callback_url: 'https://webhook.site/abc123',
      queue_position: 5,
      estimated_processing_time: 900,
    },

    outputFields: [
      { key: 'job_id', label: '🆔 ID del Trabajo Batch', type: 'string' },
      { key: 'batch_name', label: '🏷️ Nombre del Lote', type: 'string' },
      { key: 'status', label: '📊 Estado del Procesamiento', type: 'string' },
      { key: 'submitted_at', label: '📅 Fecha de Envío', type: 'datetime' },
      {
        key: 'estimated_completion_time',
        label: '⏱️ Tiempo Estimado de Finalización',
        type: 'datetime',
      },
      {
        key: 'estimated_processing_time',
        label: '🕒 Tiempo Estimado de Procesamiento (segundos)',
        type: 'integer',
      },
      { key: 'input_method', label: '📥 Método de Entrada Utilizado', type: 'string' },
      { key: 'total_emails_estimated', label: '📧 Total de Emails Estimado', type: 'string' },
      {
        key: 'validation_options__check_smtp',
        label: '🔄 Verificación SMTP Solicitada',
        type: 'boolean',
      },
      { key: 'validation_options__include_raw_dns', label: '🔍 DNS Raw Incluido', type: 'boolean' },
      {
        key: 'validation_options__priority',
        label: '🎯 Prioridad de Procesamiento',
        type: 'string',
      },
      { key: 'tracking_url', label: '📍 URL de Seguimiento', type: 'string' },
      { key: 'results_url', label: '📋 URL de Resultados', type: 'string' },
      { key: 'callback_url', label: '📞 URL de Callback', type: 'string' },
      { key: 'queue_position', label: '📊 Posición en Cola', type: 'integer' },
      { key: 'can_poll_status', label: '🔄 Permite Consulta de Estado', type: 'boolean' },
      {
        key: 'recommended_poll_interval',
        label: '⏰ Intervalo Recomendado para Polling (segundos)',
        type: 'integer',
      },
    ],
  },
};

// --- Funciones auxiliares

function calculateEstimatedCompletion(totalEmails, priority, checkSmtp) {
  const emailCount =
    typeof totalEmails === 'number'
      ? totalEmails
      : typeof totalEmails === 'string' && !isNaN(totalEmails)
      ? parseInt(totalEmails)
      : 100;

  const baseTimePerEmail = checkSmtp ? 10 : 2; // segundos por email
  const priorityMultiplier = { low: 1.5, normal: 1.0, high: 0.5 }[priority] || 1.0;
  const totalSeconds = Math.max(60, emailCount * baseTimePerEmail * priorityMultiplier);
  const completionTime = new Date(Date.now() + totalSeconds * 1000);

  if (isNaN(completionTime.getTime())) {
    return new Date(Date.now() + 3600000).toISOString();
  }

  return completionTime.toISOString();
}

function getPollInterval(priority) {
  const intervals = { low: 600, normal: 300, high: 60 };
  return intervals[priority] || 300;
}

module.exports = batchValidateCreate;
