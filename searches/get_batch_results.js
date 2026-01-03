/**
 * @module GetBatchResultsSearch
 * @description Search para obtener los resultados completos de un batch de validación.
 * Incluye filtrado, paginación y múltiples formatos de exportación.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const getBatchResultsSearch = {
  key: 'get_batch_results',
  noun: 'Resultados de Batch',
  display: {
    label: '📋 Get Batch Results',
    description:
      'Get detailed results of a completed batch validation with filtering, pagination, and export options.',
  },

  operation: {
    inputFields: [
      {
        key: 'job_id',
        type: 'string',
        required: true,
        label: '🆔 ID del Batch',
        helpText: 'El identificador único del batch de validación completado',
        placeholder: 'batch_550e8400-e29b-41d4-a716-446655440000',
      },
      {
        key: 'filter_status',
        type: 'string',
        required: false,
        label: '🎯 Filtrar por Estado',
        helpText: 'Filtrar resultados por estado de validación',
        choices: {
          all: '📊 Todos los resultados',
          valid: '✅ Solo válidos',
          invalid: '❌ Solo inválidos',
          risky: '⚠️ Solo riesgosos',
          unknown: '❓ Solo desconocidos',
        },
        default: 'all',
      },
      {
        key: 'page',
        type: 'integer',
        required: false,
        label: '📄 Página',
        helpText: 'Número de página para paginación (empieza en 1)',
        default: '1',
      },
      {
        key: 'page_size',
        type: 'integer',
        required: false,
        label: '📊 Resultados por Página',
        helpText: 'Cantidad de resultados por página (máximo 100)',
        default: '50',
        choices: {
          10: '10 resultados',
          25: '25 resultados',
          50: '50 resultados',
          100: '100 resultados',
        },
      },
      {
        key: 'sort_by',
        type: 'string',
        required: false,
        label: '📈 Ordenar por',
        helpText: 'Campo para ordenar los resultados',
        choices: {
          email: '📧 Email (A-Z)',
          risk_score: '⚠️ Puntuación de Riesgo',
          quality_score: '⭐ Puntuación de Calidad',
          status: '📊 Estado',
        },
        default: 'email',
      },
      {
        key: 'sort_order',
        type: 'string',
        required: false,
        label: '🔄 Orden',
        helpText: 'Dirección del ordenamiento',
        choices: {
          asc: '⬆️ Ascendente',
          desc: '⬇️ Descendente',
        },
        default: 'asc',
      },
      {
        key: 'include_details',
        type: 'boolean',
        required: false,
        label: '🔍 Incluir Detalles Completos',
        helpText: 'Incluir información detallada de DNS, SMTP y spam trap para cada email',
        default: 'false',
      },
    ],

    perform: async (z, bundle) => {
      const {
        job_id,
        filter_status = 'all',
        page = 1,
        page_size = 50,
        sort_by = 'email',
        sort_order = 'asc',
        include_details = false,
      } = bundle.inputData;

      if (!job_id || !job_id.trim()) {
        throw new z.errors.Error('El ID del batch es requerido', 'MISSING_JOB_ID');
      }

      const cleanJobId = job_id.trim();
      const validatedPage = Math.max(1, parseInt(page) || 1);
      const validatedPageSize = Math.min(100, Math.max(1, parseInt(page_size) || 50));

      try {
        const response = await z.request({
          url: `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/results`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          params: {
            filter: filter_status !== 'all' ? filter_status : undefined,
            page: validatedPage,
            page_size: validatedPageSize,
            sort_by,
            sort_order,
            include_details: include_details ? 'true' : 'false',
          },
          timeout: 30000,
        });

        switch (response.status) {
          case 200:
            break;
          case 400:
            throw new z.errors.Error('Parámetros de consulta inválidos.', 'INVALID_PARAMS');
          case 401:
            throw new z.errors.Error(
              'Autenticación inválida. Verifique sus credenciales.',
              'AUTHENTICATION_FAILED'
            );
          case 403:
            throw new z.errors.Error('No tiene permisos para ver estos resultados.', 'FORBIDDEN');
          case 404:
            throw new z.errors.Error(
              `Batch no encontrado: ${cleanJobId}. Verifique el ID.`,
              'BATCH_NOT_FOUND'
            );
          case 409:
            throw new z.errors.Error(
              'El batch aún no ha completado. Use "Consultar Estado de Batch" primero.',
              'BATCH_NOT_COMPLETE'
            );
          case 429:
            throw new z.errors.RateLimitError(
              'Límite de consultas excedido. Espere antes de consultar nuevamente.'
            );
          default:
            throw new z.errors.Error(`Error del servidor: ${response.status}`, 'SERVER_ERROR');
        }

        const resultsData = response.json;

        if (!resultsData || typeof resultsData !== 'object') {
          throw new z.errors.Error('Respuesta inválida del servidor', 'INVALID_RESPONSE');
        }

        // Enriquecer los resultados
        const enrichedResults = {
          job_id: cleanJobId,
          queried_at: new Date().toISOString(),
          query_params: {
            filter_status,
            page: validatedPage,
            page_size: validatedPageSize,
            sort_by,
            sort_order,
            include_details,
          },

          // Información de paginación
          pagination: {
            current_page: resultsData.page || validatedPage,
            page_size: resultsData.page_size || validatedPageSize,
            total_results: resultsData.total || 0,
            total_pages: Math.ceil((resultsData.total || 0) / validatedPageSize),
            has_next_page:
              (resultsData.page || validatedPage) <
              Math.ceil((resultsData.total || 0) / validatedPageSize),
            has_previous_page: (resultsData.page || validatedPage) > 1,
          },

          // Resumen de resultados
          summary: resultsData.summary || {
            total: resultsData.total || 0,
            valid: 0,
            invalid: 0,
            risky: 0,
            unknown: 0,
          },

          // Resultados individuales (procesados)
          results: (resultsData.results || []).map((result, index) => ({
            ...result,
            result_index: (validatedPage - 1) * validatedPageSize + index + 1,
            risk_level: getRiskLevel(result.risk_score),
            quality_tier: getQualityTier(result.quality_score),
            is_safe_to_send: result.status === 'valid' && (result.risk_score || 0) < 0.3,
          })),

          // Conteo de resultados en esta página
          results_count: (resultsData.results || []).length,

          // URLs de exportación
          export_urls: {
            csv: `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/export?format=csv`,
            json: `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/export?format=json`,
            xlsx: `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/export?format=xlsx`,
          },

          // Navegación
          navigation: {
            next_page_url:
              (resultsData.page || validatedPage) <
              Math.ceil((resultsData.total || 0) / validatedPageSize)
                ? `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/results?page=${
                    validatedPage + 1
                  }&page_size=${validatedPageSize}`
                : null,
            previous_page_url:
              validatedPage > 1
                ? `https://api.mailsafepro.com/v1/validate/batch/${cleanJobId}/results?page=${
                    validatedPage - 1
                  }&page_size=${validatedPageSize}`
                : null,
          },
        };

        return [enrichedResults];
      } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            'Timeout al obtener resultados. Intente con menos resultados por página.',
            'RESULTS_QUERY_TIMEOUT'
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
      queried_at: '2024-01-15T10:30:00.000Z',
      query_params: {
        filter_status: 'all',
        page: 1,
        page_size: 50,
        sort_by: 'email',
        sort_order: 'asc',
        include_details: false,
      },
      pagination: {
        current_page: 1,
        page_size: 50,
        total_results: 500,
        total_pages: 10,
        has_next_page: true,
        has_previous_page: false,
      },
      summary: {
        total: 500,
        valid: 425,
        invalid: 50,
        risky: 20,
        unknown: 5,
      },
      results: [
        {
          result_index: 1,
          email: 'usuario1@ejemplo.com',
          status: 'valid',
          valid: true,
          risk_score: 0.1,
          quality_score: 0.92,
          risk_level: 'low',
          quality_tier: 'excellent',
          is_safe_to_send: true,
          provider: 'gmail',
        },
        {
          result_index: 2,
          email: 'usuario2@dominio.com',
          status: 'risky',
          valid: true,
          risk_score: 0.65,
          quality_score: 0.45,
          risk_level: 'medium',
          quality_tier: 'fair',
          is_safe_to_send: false,
          provider: 'unknown',
        },
      ],
      results_count: 50,
      export_urls: {
        csv: 'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/export?format=csv',
        json: 'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/export?format=json',
        xlsx: 'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/export?format=xlsx',
      },
      navigation: {
        next_page_url:
          'https://api.mailsafepro.com/v1/validate/batch/batch_550e8400-e29b-41d4-a716-446655440000/results?page=2&page_size=50',
        previous_page_url: null,
      },
    },

    outputFields: [
      { key: 'job_id', label: '🆔 ID del Batch', type: 'string' },
      { key: 'queried_at', label: '🔍 Fecha de Consulta', type: 'datetime' },

      // Paginación
      { key: 'pagination__current_page', label: '📄 Página Actual', type: 'integer' },
      { key: 'pagination__page_size', label: '📊 Tamaño de Página', type: 'integer' },
      { key: 'pagination__total_results', label: '📈 Total de Resultados', type: 'integer' },
      { key: 'pagination__total_pages', label: '📑 Total de Páginas', type: 'integer' },
      { key: 'pagination__has_next_page', label: '➡️ Tiene Siguiente Página', type: 'boolean' },
      { key: 'pagination__has_previous_page', label: '⬅️ Tiene Página Anterior', type: 'boolean' },

      // Resumen
      { key: 'summary__total', label: '📊 Total Procesados', type: 'integer' },
      { key: 'summary__valid', label: '✅ Válidos', type: 'integer' },
      { key: 'summary__invalid', label: '❌ Inválidos', type: 'integer' },
      { key: 'summary__risky', label: '⚠️ Riesgosos', type: 'integer' },
      { key: 'summary__unknown', label: '❓ Desconocidos', type: 'integer' },

      // Resultados (primer elemento como ejemplo)
      { key: 'results[]email', label: '📧 Email', type: 'string' },
      { key: 'results[]status', label: '📊 Estado', type: 'string' },
      { key: 'results[]valid', label: '✅ Válido', type: 'boolean' },
      { key: 'results[]risk_score', label: '⚠️ Puntuación de Riesgo', type: 'number' },
      { key: 'results[]quality_score', label: '⭐ Puntuación de Calidad', type: 'number' },
      { key: 'results[]risk_level', label: '🔴 Nivel de Riesgo', type: 'string' },
      { key: 'results[]quality_tier', label: '🏆 Nivel de Calidad', type: 'string' },
      { key: 'results[]is_safe_to_send', label: '✉️ Seguro para Enviar', type: 'boolean' },
      { key: 'results[]provider', label: '🏢 Proveedor', type: 'string' },

      // Conteo
      { key: 'results_count', label: '📊 Resultados en Esta Página', type: 'integer' },

      // URLs de exportación
      { key: 'export_urls__csv', label: '📥 Exportar CSV', type: 'string' },
      { key: 'export_urls__json', label: '📥 Exportar JSON', type: 'string' },
      { key: 'export_urls__xlsx', label: '📥 Exportar Excel', type: 'string' },

      // Navegación
      { key: 'navigation__next_page_url', label: '➡️ URL Siguiente Página', type: 'string' },
      { key: 'navigation__previous_page_url', label: '⬅️ URL Página Anterior', type: 'string' },
    ],
  },
};

// Funciones auxiliares
function getRiskLevel(riskScore) {
  if (riskScore === undefined || riskScore === null) return 'unknown';
  if (riskScore < 0.3) return 'low';
  if (riskScore < 0.7) return 'medium';
  return 'high';
}

function getQualityTier(qualityScore) {
  if (qualityScore === undefined || qualityScore === null) return 'unknown';
  if (qualityScore > 0.8) return 'excellent';
  if (qualityScore > 0.6) return 'good';
  if (qualityScore > 0.4) return 'fair';
  return 'poor';
}

module.exports = getBatchResultsSearch;
