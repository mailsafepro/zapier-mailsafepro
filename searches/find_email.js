/**
 * @module FindEmailSearch
 * @description Search para buscar una validación previa por dirección de email.
 * Utiliza caché para encontrar validaciones existentes.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const findEmailSearch = {
  key: 'find_email',
  noun: 'Email Validation',
  display: {
    label: 'Find Email Validation',
    description: 'Find a previous email validation by address.',
  },

  operation: {
    // Enable "Find or Create" capability
    performGet: async (z, bundle) => {
      // This allows Zapier to use the 'validate_email_action' create when search returns nothing
      // if configured by the user in "Create MailSafePro Validation if it doesn't exist yet?"
      return [];
    },
    inputFields: [
      {
        key: 'email',
        type: 'string',
        required: true,
        label: 'Email Address',
        helpText: 'Email address to search for',
      },
      {
        key: 'check_cache_only',
        type: 'boolean',
        required: false,
        default: 'true',
        label: 'Check Cache Only',
        helpText: 'Only search in cache (faster, no new validation)',
      },
    ],

    perform: async (z, bundle) => {
      const email = bundle.inputData.email?.trim();
      const checkCacheOnly = bundle.inputData.check_cache_only !== false;

      if (!email) {
        throw new z.errors.Error('Email is required', 'MISSING_EMAIL');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new z.errors.Error('Invalid email format', 'INVALID_EMAIL');
      }

      try {
        // Debug: log what's being sent
        z.console.log('[FindEmail] Starting search for:', email);
        z.console.log('[FindEmail] API Key present:', !!bundle.authData.apiKey);
        z.console.log('[FindEmail] JWT present:', !!bundle.authData.jwt);
        z.console.log('[FindEmail] Check cache only:', checkCacheOnly);
        
        const response = await z.request({
          url: 'https://api.mailsafepro.es/validate/email',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          body: {
            email,
            check_cache: checkCacheOnly,
          },
          timeout: 30000,
          skipThrowForStatus: true,
        });

        z.console.log('[FindEmail] Response status:', response.status);
        z.console.log('[FindEmail] Response body:', JSON.stringify(response.json));

        switch (response.status) {
          case 200:
            break;
          case 400:
            throw new z.errors.Error('Invalid request parameters', 'INVALID_REQUEST');
          case 401:
            throw new z.errors.Error('Authentication failed. Please check your API key.', 'AUTH_FAILED');
          case 403:
            throw new z.errors.Error('Forbidden. Check your plan and permissions.', 'AUTH_FORBIDDEN');
          case 404:
            z.console.log('[FindEmail] Email not found in cache');
            return []; // Email not found in cache
          case 429:
            throw new z.errors.RateLimitError('Rate limit exceeded. Please wait before trying again.');
          default:
            throw new z.errors.Error(`Server error: ${response.status}`, 'SERVER_ERROR');
        }

        const result = response.json;

        // Enriquecer resultado con campos calculados
        const enrichedResult = {
          ...result,
          risk_level: getRiskLevel(result.risk_score),
          quality_tier: getQualityTier(result.quality_score),
          is_high_risk: result.risk_score >= 0.7,
          is_premium_provider: result.provider_analysis?.reputation >= 0.8,
          found_in_cache: result.cache_used === true,
          searched_at: new Date().toISOString(),
        };

        return [enrichedResult];
      } catch (error) {
        if (error.name === 'Error' && error.status) {
          throw error;
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
          throw new z.errors.Error('Connection timeout. Please try again.', 'TIMEOUT');
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new z.errors.Error('Cannot connect to service. Check your connection.', 'NETWORK_ERROR');
        }
        throw new z.errors.Error(`Network error: ${error.message}`, 'NETWORK_ERROR');
      }
    },

    sample: {
      email: 'found@example.com',
      valid: true,
      status: 'deliverable',
      risk_score: 0.05,
      quality_score: 0.98,
      risk_level: 'low',
      quality_tier: 'excellent',
      is_high_risk: false,
      is_premium_provider: true,
      found_in_cache: true,
      validated_at: '2024-01-15T10:00:00.000Z',
      searched_at: '2024-01-15T14:30:00.000Z',
      cache_used: true,
      provider_analysis: {
        provider: 'gmail',
        reputation: 0.95,
        fingerprint: 'google_mx_1',
      },
    },

    outputFields: [
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'valid', label: 'Valid', type: 'boolean' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'risk_score', label: 'Risk Score', type: 'number' },
      { key: 'quality_score', label: 'Quality Score', type: 'number' },
      { key: 'risk_level', label: 'Risk Level', type: 'string' },
      { key: 'quality_tier', label: 'Quality Tier', type: 'string' },
      { key: 'is_high_risk', label: 'Is High Risk', type: 'boolean' },
      { key: 'is_premium_provider', label: 'Is Premium Provider', type: 'boolean' },
      { key: 'found_in_cache', label: 'Found in Cache', type: 'boolean' },
      { key: 'validated_at', label: 'Validated At', type: 'datetime' },
      { key: 'searched_at', label: 'Searched At', type: 'datetime' },
      { key: 'provider_analysis__provider', label: 'Provider', type: 'string' },
      { key: 'provider_analysis__reputation', label: 'Provider Reputation', type: 'number' },
    ],
  },

  // Link to the Create action for "Find or Create"

};

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

module.exports = findEmailSearch;
