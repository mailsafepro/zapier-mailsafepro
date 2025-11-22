/**
 * Trigger para validación individual de email - Versión Premium
 * Integración optimizada para MailSafePro API v2
 */

const validateEmailTrigger = {
  key: 'validate_email_premium',
  noun: 'Validación Email Avanzada',
  display: {
    label: '🔍 Validar Email Avanzado',
    description:
      'Valida un email con puntuación de riesgo, detección de spam traps y análisis completo de deliverability.',
  },
  operation: {
    inputFields: [
      {
        key: 'email',
        type: 'string',
        required: true,
        label: '📧 Email a validar',
        helpText:
          'Dirección de correo electrónico para validación completa. Ej: usuario@dominio.com',
        placeholder: 'usuario@ejemplo.com',
      },
      {
        key: 'check_smtp',
        type: 'boolean',
        required: false,
        default: 'false',
        label: '✅ Verificación SMTP',
        helpText:
          'Realizar verificación SMTP real del servidor de correo (más lente pero más preciso)',
      },
      {
        key: 'include_raw_dns',
        type: 'boolean',
        required: false,
        default: 'false',
        label: '🔍 Incluir Registros DNS Completos',
        helpText: 'Incluir registros SPF, DKIM y DMARC completos en los resultados',
      },
      {
        key: 'validation_timeout',
        type: 'integer',
        required: false,
        default: '30',
        label: '⏱️ Timeout personalizado (segundos)',
        helpText: 'Tiempo máximo de espera para la validación (15-60 segundos)',
        choices: {
          15: '15 segundos',
          30: '30 segundos (recomendado)',
          45: '45 segundos',
          60: '60 segundos',
        },
      },
    ],

    perform: async (z, bundle) => {
      const email = bundle.inputData.email?.trim();

      if (!email) {
        throw new z.errors.Error('El campo email es requerido', 'MISSING_EMAIL');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        throw new z.errors.Error('Formato de email inválido', 'INVALID_EMAIL_FORMAT');
      }

      const payload = {
        email,
        check_smtp: bundle.inputData.check_smtp || false,
        include_raw_dns: bundle.inputData.include_raw_dns || false,
      };

      const timeout = Math.min(Math.max(bundle.inputData.validation_timeout || 30, 15), 60) * 1000;

      let response;
      try {
        response = await z.request({
          url: 'https://api.mailsafepro.com/v1/validate/email',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-Integration/2.0.0',
            'X-Client-Version': '2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          body: JSON.stringify(payload),
          timeout,
        });
      } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error(
            `Timeout de validación (${timeout}ms). El servicio puede estar ocupado. Intente con un timeout mayor.`,
            'VALIDATION_TIMEOUT'
          );
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new z.errors.Error(
            'No se puede conectar al servicio de validación. Verifique su conexión a internet.',
            'NETWORK_ERROR'
          );
        }
        throw error;
      }

      switch (response.status) {
        case 200:
          break; // Éxito, continuar
        case 400:
          throw new z.errors.Error(
            'Solicitud inválida: verifique el formato del email',
            'VALIDATION_ERROR'
          );
        case 401:
          throw new z.errors.Error(
            'Autenticación inválida. Verifique su API Key o JWT Token',
            'AUTHENTICATION_FAILED'
          );
        case 403:
          throw new z.errors.Error(
            'Acceso denegado. Su plan no incluye esta funcionalidad',
            'PLAN_LIMITATION'
          );
        case 404:
          throw new z.errors.Error(
            'Endpoint no encontrado. Contacte al soporte técnico',
            'ENDPOINT_NOT_FOUND'
          );
        case 429:
          throw new z.errors.RateLimitError(
            'Límite de tasa excedido. Por favor espere antes de realizar más validaciones',
            'RATE_LIMIT_EXCEEDED'
          );
        case 500:
        case 502:
        case 503:
          throw new z.errors.Error(
            'Servicio temporalmente no disponible. Intente nuevamente en unos minutos',
            'SERVICE_UNAVAILABLE'
          );
        default:
          throw new z.errors.Error(
            `Error inesperado: ${response.status} - ${response.json?.detail || 'Contacte soporte'}`,
            'UNKNOWN_ERROR'
          );
      }

      const result = response.json;

      if (!result || typeof result !== 'object') {
        throw new z.errors.Error('Respuesta inválida del servidor', 'INVALID_API_RESPONSE');
      }

      if (!result.email) {
        throw new z.errors.Error(
          'La respuesta de la API no incluye el campo email',
          'MISSING_EMAIL_IN_RESPONSE'
        );
      }

      const enrichedResult = {
        ...result,
        deliverability_status:
          result.status === 'deliverable'
            ? 'high'
            : result.status === 'risky'
            ? 'medium'
            : result.status === 'undeliverable'
            ? 'low'
            : 'unknown',
        risk_level: result.risk_score < 0.3 ? 'low' : result.risk_score < 0.7 ? 'medium' : 'high',
        quality_tier:
          result.quality_score > 0.8
            ? 'excellent'
            : result.quality_score > 0.6
            ? 'good'
            : result.quality_score > 0.4
            ? 'fair'
            : 'poor',
        is_high_risk: result.risk_score >= 0.7,
        is_premium_provider: result.provider_analysis?.reputation >= 0.8,
        has_security_records:
          result.dns_security?.spf?.status === 'valid' ||
          result.dns_security?.dkim?.status === 'valid',
        validated_at: new Date().toISOString(),
      };

      return [enrichedResult];
    },

    sample: {
      id: 'val_123456789',
      email: 'usuario@ejemplo.com',
      valid: true,
      status: 'deliverable',
      detail: 'Email format and domain are valid',
      processing_time: 1.2345,
      risk_score: 0.15,
      quality_score: 0.89,
      validation_tier: 'premium',
      suggested_action: 'accept',
      deliverability_status: 'high',
      risk_level: 'low',
      quality_tier: 'excellent',
      is_high_risk: false,
      is_premium_provider: true,
      has_security_records: true,
      validated_at: '2024-01-15T10:30:00.000Z',
      provider_analysis: {
        provider: 'gmail',
        reputation: 0.95,
        fingerprint: 'google_mx_1',
      },
      smtp_validation: {
        checked: true,
        mailbox_exists: true,
        mx_server: 'gmail-smtp-in.l.google.com',
        detail: 'Mailbox verification successful',
      },
      dns_security: {
        spf: {
          status: 'valid',
          record: 'v=spf1 include:_spf.google.com ~all',
        },
        dkim: {
          status: 'valid',
          selector: 'google',
          key_type: 'RSA',
          key_length: 2048,
        },
        dmarc: {
          status: 'valid',
          policy: 'quarantine',
          record: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com',
        },
      },
      spam_trap_check: {
        checked: true,
        is_spam_trap: false,
        confidence: 0.05,
        trap_type: 'none',
        source: 'internal_database',
      },
      metadata: {
        timestamp: '2024-01-15T10:30:00.000Z',
        validation_id: '550e8400-e29b-41d4-a716-446655440000',
        cache_used: false,
      },
      client_plan: 'PREMIUM',
    },

    outputFields: [
      { key: 'email', label: '📧 Email validado', type: 'string' },
      { key: 'valid', label: '✅ Válido', type: 'boolean' },
      { key: 'status', label: '🎯 Estado de entrega', type: 'string' },
      { key: 'detail', label: '📝 Detalle del resultado', type: 'string' },
      { key: 'risk_score', label: '⚠️ Puntuación de riesgo (0-1)', type: 'number' },
      { key: 'quality_score', label: '⭐ Puntuación de calidad (0-1)', type: 'number' },
      { key: 'processing_time', label: '⏱️ Tiempo de procesamiento (segundos)', type: 'number' },
      { key: 'deliverability_status', label: '🚚 Nivel de entregabilidad', type: 'string' },
      { key: 'risk_level', label: '🔴 Nivel de riesgo', type: 'string' },
      { key: 'quality_tier', label: '🏆 Nivel de calidad', type: 'string' },
      { key: 'is_high_risk', label: '🚨 Alto riesgo', type: 'boolean' },
      { key: 'is_premium_provider', label: '🏅 Proveedor premium', type: 'boolean' },
      { key: 'has_security_records', label: '🛡️ Tiene registros seguridad', type: 'boolean' },
      { key: 'provider_analysis__provider', label: '🏢 Proveedor de email', type: 'string' },
      {
        key: 'provider_analysis__reputation',
        label: '📊 Reputación del proveedor',
        type: 'number',
      },
      { key: 'provider_analysis__fingerprint', label: '🔍 Huella del proveedor', type: 'string' },
      { key: 'smtp_validation__checked', label: '🔍 SMTP verificado', type: 'boolean' },
      { key: 'smtp_validation__mailbox_exists', label: '📭 Buzón existe', type: 'boolean' },
      { key: 'smtp_validation__mx_server', label: '🖥️ Servidor MX', type: 'string' },
      { key: 'smtp_validation__detail', label: '📋 Detalle SMTP', type: 'string' },
      { key: 'dns_security__spf__status', label: '🛡️ Estado SPF', type: 'string' },
      { key: 'dns_security__dkim__status', label: '🔐 Estado DKIM', type: 'string' },
      { key: 'dns_security__dmarc__status', label: '📨 Estado DMARC', type: 'string' },
      { key: 'spam_trap_check__checked', label: '🔎 Spam trap verificado', type: 'boolean' },
      { key: 'spam_trap_check__is_spam_trap', label: '🚫 Es spam trap', type: 'boolean' },
      { key: 'spam_trap_check__confidence', label: '🎯 Confianza detección spam', type: 'number' },
      { key: 'spam_trap_check__trap_type', label: '🎣 Tipo de spam trap', type: 'string' },
      { key: 'metadata__validation_id', label: '🆔 ID de validación', type: 'string' },
      { key: 'metadata__cache_used', label: '💾 Cache usado', type: 'boolean' },
      { key: 'client_plan', label: '💎 Plan del cliente', type: 'string' },
      { key: 'validated_at', label: '📅 Fecha de validación', type: 'datetime' },
    ],
  },
};

module.exports = validateEmailTrigger;
