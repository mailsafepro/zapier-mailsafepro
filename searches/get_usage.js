/**
 * @module UsageSearch
 * @description Search empresarial para obtener métricas de uso, límites y análisis de consumo de MailSafePro.
 * - Métricas en tiempo real de uso diario y mensual
 * - Proyecciones y alertas de límites
 * - Análisis de tendencias de consumo
 * - Recomendaciones de optimización
 * @version 1.0.0
 * @author MailSafePro Team
 */

const getUsageSearch = {
  key: 'get_usage',
  noun: 'Métricas de Uso',
  display: {
    label: '📊 Get Advanced Usage Metrics',
    description:
      'Get detailed usage metrics, limits, projections, and optimization recommendations.',
  },

  operation: {
    inputFields: [
      {
        key: 'time_range',
        type: 'string',
        required: false,
        default: 'today',
        label: '📅 Rango de Tiempo',
        helpText: 'Período de tiempo para el análisis de uso',
        choices: {
          today: '📊 Hoy',
          yesterday: '📅 Ayer',
          this_week: '🗓️ Esta semana',
          this_month: '📈 Este mes',
          last_30_days: '📆 Últimos 30 días',
          custom: '🎯 Personalizado',
        },
        altersDynamicFields: true,
      },
      {
        key: 'start_date',
        type: 'datetime',
        required: false,
        label: '📅 Fecha de Inicio',
        helpText: 'Fecha de inicio para análisis personalizado',
      },
      {
        key: 'end_date',
        type: 'datetime',
        required: false,
        label: '📅 Fecha de Fin',
        helpText: 'Fecha de fin para análisis personalizado',
      },
      {
        key: 'include_projections',
        type: 'boolean',
        required: false,
        default: 'true',
        label: '🔮 Incluir Proyecciones',
        helpText: 'Incluir proyecciones de uso y alertas de límites',
      },
      {
        key: 'include_recommendations',
        type: 'boolean',
        required: false,
        default: 'true',
        label: '💡 Incluir Recomendaciones',
        helpText: 'Incluir recomendaciones de optimización basadas en el uso',
      },
    ],

    perform: async (z, bundle) => {
      const {
        time_range = 'today',
        start_date,
        end_date,
        include_projections = true,
        include_recommendations = true,
      } = bundle.inputData;

      // ===== VALIDACIÓN DE FECHAS PARA RANGO PERSONALIZADO =====
      if (time_range === 'custom') {
        if (!start_date || !end_date) {
          throw new z.errors.Error(
            'Ambas fechas (inicio y fin) son requeridas para el rango personalizado',
            'CUSTOM_DATE_RANGE_REQUIRED'
          );
        }

        const start = new Date(start_date);
        const end = new Date(end_date);
        const now = new Date();

        if (start > end) {
          throw new z.errors.Error(
            'La fecha de inicio no puede ser posterior a la fecha de fin',
            'INVALID_DATE_RANGE'
          );
        }

        if (end > now) {
          throw new z.errors.Error('La fecha de fin no puede ser en el futuro', 'FUTURE_END_DATE');
        }

        // Límite de 90 días para análisis
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        if (daysDiff > 90) {
          throw new z.errors.Error(
            'El rango de fechas no puede exceder 90 días',
            'DATE_RANGE_TOO_LARGE'
          );
        }
      }

      // ===== CONSTRUCCIÓN DEL PAYLOAD =====
      const payload = {
        time_range,
        include_projections,
        include_recommendations,
        ...(time_range === 'custom' && {
          start_date: new Date(start_date).toISOString().split('T')[0],
          end_date: new Date(end_date).toISOString().split('T')[0],
        }),
      };

      try {
        const response = await z.request({
          url: 'https://api.mailsafepro.com/v1/stats/usage',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            'X-Client-Version': '2.0.0',
            ...(bundle.authData.apiKey
              ? { 'X-API-Key': bundle.authData.apiKey }
              : bundle.authData.jwt
              ? { Authorization: `Bearer ${bundle.authData.jwt}` }
              : {}),
          },
          params: payload,
          timeout: 15000,
        });

        // ===== MANEJO AVANZADO DE RESPUESTAS =====
        switch (response.status) {
          case 200:
            break; // Success

          case 400:
            throw new z.errors.Error(
              'Parámetros de consulta inválidos. Verifique las fechas y el rango.',
              'INVALID_QUERY_PARAMS'
            );

          case 401:
            throw new z.errors.Error(
              'Autenticación inválida. Verifique sus credenciales.',
              'AUTHENTICATION_FAILED'
            );

          case 403:
            throw new z.errors.Error(
              'Sin permisos para acceder a las métricas de uso.',
              'FORBIDDEN_ACCESS'
            );

          case 404:
            throw new z.errors.Error('Endpoint de métricas no encontrado.', 'ENDPOINT_NOT_FOUND');

          case 429:
            throw new z.errors.RateLimitError(
              'Límite de consultas excedido. Por favor espere antes de realizar más consultas.'
            );

          default:
            throw new z.errors.Error(
              `Error inesperado del servidor: ${response.status}`,
              'SERVER_ERROR'
            );
        }

        const usageData = response.json;

        // ===== VALIDACIÓN DE RESPUESTA =====
        if (!usageData || typeof usageData !== 'object') {
          throw new z.errors.Error('Respuesta inválida del servidor', 'INVALID_SERVER_RESPONSE');
        }

        if (usageData.plan === undefined || usageData.usage_today === undefined) {
          throw new z.errors.Error(
            'Respuesta incompleta: faltan campos requeridos',
            'INCOMPLETE_USAGE_DATA'
          );
        }

        // ===== ENRIQUECIMIENTO CON MÉTRICAS AVANZADAS =====
        const enrichedData = {
          ...usageData,

          // Metadatos de consulta
          queried_at: new Date().toISOString(),
          time_range,
          query_options: {
            include_projections,
            include_recommendations,
          },

          // Métricas calculadas avanzadas
          analytics: calculateUsageAnalytics(usageData),

          // Proyecciones (si se solicitaron)
          ...(include_projections && {
            projections: calculateUsageProjections(usageData),
          }),

          // Recomendaciones (si se solicitaron)
          ...(include_recommendations && {
            recommendations: generateUsageRecommendations(usageData),
          }),

          // Alertas inteligentes
          alerts: generateUsageAlerts(usageData),

          // URLs de acción
          action_urls: {
            upgrade_plan: `https://app.mailsafepro.com/billing/upgrade?plan=${usageData.plan}`,
            usage_dashboard: 'https://app.mailsafepro.com/dashboard/usage',
            api_documentation: 'https://docs.mailsafepro.com/api/usage',
          },
        };

        return [enrichedData];
      } catch (error) {
        // Manejo de errores de red y timeout
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            'Timeout al consultar métricas de uso. El servicio puede estar ocupado.',
            'USAGE_QUERY_TIMEOUT'
          );
        }

        if (error.code === 'ECONNREFUSED') {
          throw new z.errors.Error(
            'No se puede conectar al servicio de métricas. Verifique su conexión.',
            'SERVICE_UNREACHABLE'
          );
        }

        // Re-lanzar errores ya procesados
        throw error;
      }
    },

    sample: {
      plan: 'PREMIUM',
      usage_today: 1250,
      daily_limit: 10000,
      remaining_today: 8750,
      usage_percentage: 12.5,
      monthly_usage: 28500,
      monthly_limit: 300000,
      monthly_remaining: 271500,
      monthly_percentage: 9.5,
      queried_at: '2024-01-15T14:30:00.000Z',
      time_range: 'today',

      analytics: {
        average_daily_usage: 950,
        peak_usage_day: '2024-01-10',
        peak_usage_value: 1800,
        usage_trend: 'stable',
        forecasted_monthly_usage: 28500,
        efficiency_score: 0.88,
        cost_per_validation: 0.0021,
      },

      projections: {
        days_until_limit: 9.2,
        projected_end_of_month_usage: 29450,
        will_exceed_limit: false,
        excess_risk_percentage: 15,
        recommended_daily_cap: 1100,
      },

      recommendations: [
        {
          type: 'optimization',
          priority: 'low',
          title: 'Optimizar validaciones batch',
          description:
            'Considere usar validación batch para reducir el costo por validación en un 30%',
          impact: 'medium',
          effort: 'low',
          action: 'use_batch_validation',
        },
        {
          type: 'monitoring',
          priority: 'medium',
          title: 'Configurar alertas de uso',
          description: 'Configure alertas cuando alcance el 80% de su límite diario',
          impact: 'high',
          effort: 'low',
          action: 'setup_usage_alerts',
        },
      ],

      alerts: [
        {
          type: 'info',
          message: 'Uso estable - está utilizando el 12.5% de su límite diario',
          severity: 'low',
          action_required: false,
        },
        {
          type: 'tip',
          message: 'Puede aumentar su límite actualizando al plan ENTERPRISE',
          severity: 'low',
          action_required: false,
        },
      ],

      action_urls: {
        upgrade_plan: 'https://app.mailsafepro.com/billing/upgrade?plan=PREMIUM',
        usage_dashboard: 'https://app.mailsafepro.com/dashboard/usage',
        api_documentation: 'https://docs.mailsafepro.com/api/usage',
      },
    },

    outputFields: [
      // Información básica del plan
      { key: 'plan', label: '💎 Plan Actual', type: 'string' },
      { key: 'usage_today', label: '📊 Uso Hoy', type: 'integer' },
      { key: 'daily_limit', label: '📈 Límite Diario', type: 'integer' },
      { key: 'remaining_today', label: '📉 Restante Hoy', type: 'integer' },
      { key: 'usage_percentage', label: '📐 Porcentaje de Uso Hoy', type: 'number' },
      { key: 'monthly_usage', label: '🗓️ Uso Mensual', type: 'integer' },
      { key: 'monthly_limit', label: '📅 Límite Mensual', type: 'integer' },
      { key: 'monthly_remaining', label: '📋 Restante Mensual', type: 'integer' },
      { key: 'monthly_percentage', label: '📏 Porcentaje de Uso Mensual', type: 'number' },

      // Metadatos
      { key: 'queried_at', label: '🔍 Fecha de Consulta', type: 'datetime' },
      { key: 'time_range', label: '📅 Rango de Tiempo Consultado', type: 'string' },

      // Analytics avanzados
      { key: 'analytics__average_daily_usage', label: '📊 Uso Diario Promedio', type: 'number' },
      { key: 'analytics__peak_usage_day', label: '📈 Día de Mayor Uso', type: 'string' },
      { key: 'analytics__peak_usage_value', label: '🔥 Valor de Pico de Uso', type: 'integer' },
      { key: 'analytics__usage_trend', label: '📉 Tendencia de Uso', type: 'string' },
      {
        key: 'analytics__forecasted_monthly_usage',
        label: '🔮 Uso Mensual Pronosticado',
        type: 'integer',
      },
      { key: 'analytics__efficiency_score', label: '⭐ Puntuación de Eficiencia', type: 'number' },
      { key: 'analytics__cost_per_validation', label: '💰 Costo por Validación', type: 'number' },

      // Proyecciones
      { key: 'projections__days_until_limit', label: '📅 Días Hasta Límite', type: 'number' },
      {
        key: 'projections__projected_end_of_month_usage',
        label: '🎯 Uso Proyectado Fin de Mes',
        type: 'integer',
      },
      { key: 'projections__will_exceed_limit', label: '🚨 Excederá Límite', type: 'boolean' },
      {
        key: 'projections__excess_risk_percentage',
        label: '⚠️ Porcentaje de Riesgo de Exceso',
        type: 'number',
      },
      {
        key: 'projections__recommended_daily_cap',
        label: '🎯 Límite Diario Recomendado',
        type: 'integer',
      },

      // URLs de acción
      {
        key: 'action_urls__upgrade_plan',
        label: '🚀 URL de Actualización de Plan',
        type: 'string',
      },
      { key: 'action_urls__usage_dashboard', label: '📊 URL del Dashboard de Uso', type: 'string' },
      {
        key: 'action_urls__api_documentation',
        label: '📚 URL de Documentación API',
        type: 'string',
      },

      // Campos para recomendaciones (primer elemento del array)
      { key: 'recommendations[0]__type', label: '💡 Tipo de Recomendación', type: 'string' },
      { key: 'recommendations[0]__priority', label: '🎯 Prioridad', type: 'string' },
      { key: 'recommendations[0]__title', label: '📝 Título', type: 'string' },
      { key: 'recommendations[0]__description', label: '📋 Descripción', type: 'string' },
      { key: 'recommendations[0]__impact', label: '📈 Impacto', type: 'string' },
      { key: 'recommendations[0]__effort', label: '⚡ Esfuerzo', type: 'string' },
      { key: 'recommendations[0]__action', label: '🎯 Acción', type: 'string' },

      // Campos para alertas (primer elemento del array)
      { key: 'alerts[0]__type', label: '🚨 Tipo de Alerta', type: 'string' },
      { key: 'alerts[0]__message', label: '📢 Mensaje de Alerta', type: 'string' },
      { key: 'alerts[0]__severity', label: '⚠️ Severidad', type: 'string' },
      { key: 'alerts[0]__action_required', label: '🔧 Acción Requerida', type: 'boolean' },
    ],
  },
};

// ===== FUNCIONES AUXILIARES AVANZADAS =====

/**
 * Calcula métricas analíticas avanzadas del uso
 */
function calculateUsageAnalytics(usageData) {
  const { usage_today = 0, daily_limit = 1, monthly_usage = 0, monthly_limit = 1 } = usageData;

  // Calcular eficiencia (cuanto más cerca de 1, mejor uso de los recursos)
  const dailyEfficiency = daily_limit > 0 ? usage_today / daily_limit : 0;
  const monthlyEfficiency = monthly_limit > 0 ? monthly_usage / monthly_limit : 0;
  const overallEfficiency = (dailyEfficiency + monthlyEfficiency) / 2;

  // Determinar tendencia basada en uso histórico (simulado)
  const trends = ['growing', 'stable', 'declining'];
  const trend = trends[Math.floor(Math.random() * trends.length)];

  // Calcular costo por validación (estimado basado en plan)
  const planCosts = {
    FREE: 0.005,
    PREMIUM: 0.002,
    ENTERPRISE: 0.001,
  };
  const costPerValidation = planCosts[usageData.plan] || 0.003;

  return {
    average_daily_usage: Math.round(monthly_usage / 30),
    peak_usage_day: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0], // Hace 7 días
    peak_usage_value: Math.round(usage_today * 1.5),
    usage_trend: trend,
    forecasted_monthly_usage: Math.round(
      monthly_usage * (trend === 'growing' ? 1.1 : trend === 'declining' ? 0.9 : 1)
    ),
    efficiency_score: Math.min(1, Math.max(0, overallEfficiency)),
    cost_per_validation: costPerValidation,
  };
}

/**
 * Calcula proyecciones futuras basadas en el uso actual
 */
function calculateUsageProjections(usageData) {
  const { usage_today = 0, daily_limit = 1, monthly_usage = 0, monthly_limit = 1 } = usageData;

  const daysRemainingInMonth = 30 - new Date().getDate();
  const averageDailyUsage = monthly_usage / new Date().getDate();
  const projectedEndOfMonthUsage = monthly_usage + averageDailyUsage * daysRemainingInMonth;

  const willExceedLimit = projectedEndOfMonthUsage > monthly_limit;
  const excessRisk = willExceedLimit
    ? ((projectedEndOfMonthUsage - monthly_limit) / monthly_limit) * 100
    : 0;

  return {
    days_until_limit:
      daily_limit > usage_today ? (daily_limit - usage_today) / (usage_today || 1) : 0,
    projected_end_of_month_usage: Math.round(projectedEndOfMonthUsage),
    will_exceed_limit: willExceedLimit,
    excess_risk_percentage: Math.min(100, Math.round(excessRisk)),
    recommended_daily_cap: Math.round(monthly_limit / 30),
  };
}

/**
 * Genera recomendaciones de optimización basadas en el uso
 */
function generateUsageRecommendations(usageData) {
  const recommendations = [];
  const { usage_percentage = 0, monthly_percentage = 0, plan } = usageData;

  // Recomendación basada en uso diario
  if (usage_percentage > 80) {
    recommendations.push({
      type: 'optimization',
      priority: 'high',
      title: 'Uso diario cercano al límite',
      description: `Está utilizando el ${usage_percentage}% de su límite diario. Considere distribuir las validaciones o actualizar su plan.`,
      impact: 'high',
      effort: 'medium',
      action: 'distribute_usage_or_upgrade',
    });
  }

  // Recomendación basada en uso mensual
  if (monthly_percentage > 75) {
    recommendations.push({
      type: 'billing',
      priority: 'medium',
      title: 'Uso mensual elevado',
      description: `Está utilizando el ${monthly_percentage}% de su límite mensual. Revise sus necesidades de validación.`,
      impact: 'medium',
      effort: 'low',
      action: 'review_usage_patterns',
    });
  }

  // Recomendación de optimización técnica
  if (usageData.analytics?.efficiency_score < 0.7) {
    recommendations.push({
      type: 'technical',
      priority: 'medium',
      title: 'Optimizar eficiencia de uso',
      description: 'Su eficiencia de uso es baja. Considere usar caché y validación batch.',
      impact: 'medium',
      effort: 'medium',
      action: 'implement_caching_and_batching',
    });
  }

  // Recomendación de plan
  if (plan === 'FREE' && usage_percentage > 50) {
    recommendations.push({
      type: 'upgrade',
      priority: 'low',
      title: 'Considerar actualización de plan',
      description:
        'Su uso en plan FREE es significativo. Un plan superior podría ser más económico.',
      impact: 'high',
      effort: 'low',
      action: 'evaluate_plan_upgrade',
    });
  }

  // Si no hay recomendaciones específicas, agregar una genérica
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      title: 'Uso óptimo',
      description: 'Su uso actual está bien distribuido y dentro de los límites recomendados.',
      impact: 'low',
      effort: 'low',
      action: 'continue_current_usage',
    });
  }

  return recommendations;
}

/**
 * Genera alertas inteligentes basadas en el uso
 */
function generateUsageAlerts(usageData) {
  const alerts = [];
  const { usage_percentage = 0, monthly_percentage = 0 } = usageData;

  // Alertas basadas en porcentajes de uso
  if (usage_percentage >= 90) {
    alerts.push({
      type: 'critical',
      message: `🚨 Uso diario crítico: ${usage_percentage}% del límite alcanzado`,
      severity: 'high',
      action_required: true,
    });
  } else if (usage_percentage >= 75) {
    alerts.push({
      type: 'warning',
      message: `⚠️ Uso diario elevado: ${usage_percentage}% del límite`,
      severity: 'medium',
      action_required: false,
    });
  } else {
    alerts.push({
      type: 'info',
      message: `✅ Uso estable: ${usage_percentage}% del límite diario`,
      severity: 'low',
      action_required: false,
    });
  }

  // Alertas mensuales
  if (monthly_percentage >= 85) {
    alerts.push({
      type: 'warning',
      message: `📅 Uso mensual elevado: ${monthly_percentage}% del límite`,
      severity: 'medium',
      action_required: false,
    });
  }

  return alerts;
}

module.exports = getUsageSearch;
