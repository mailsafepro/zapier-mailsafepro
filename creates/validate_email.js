/**
 * Action for single email validation - Premium Version
 * Optimized integration for MailSafePro API v2
 */

const validateEmailCreate = {
    key: 'validate_email_action',
    noun: 'Email Validation',
    display: {
        label: 'Validate Email',
        description:
            'Validates an email address with risk scoring, spam trap detection, and complete deliverability analysis.',
    },
    operation: {
        inputFields: [
            {
                key: 'email',
                type: 'string',
                required: true,
                label: 'Email to Validate',
                helpText:
                    'Email address to perform detailed validation on. Example: user@domain.com',
                placeholder: 'user@example.com',
            },
            {
                key: 'check_smtp',
                type: 'boolean',
                required: false,
                default: 'false',
                label: 'SMTP Verification',
                helpText:
                    'Perform real-time SMTP verification of the mailbox (slower but more accurate).',
            },
            {
                key: 'include_raw_dns',
                type: 'boolean',
                required: false,
                default: 'false',
                label: 'Include Raw DNS Records',
                helpText: 'Include full SPF, DKIM, and DMARC records in the results.',
            },
            {
                key: 'validation_timeout',
                type: 'integer',
                required: false,
                default: '30',
                label: 'Custom Timeout (seconds)',
                helpText: 'Maximum wait time for validation (15-60 seconds).',
                choices: {
                    15: '15 seconds',
                    30: '30 seconds (recommended)',
                    45: '45 seconds',
                    60: '60 seconds',
                },
            },
        ],

        perform: async (z, bundle) => {
            const email = bundle.inputData.email?.trim();

            if (!email) {
                throw new z.errors.Error('Email field is required', 'MISSING_EMAIL');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                throw new z.errors.Error('Invalid email format', 'INVALID_EMAIL_FORMAT');
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
                    url: 'https://api.mailsafepro.es/validate/email',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Zapier-MailSafePro/2.0.0',
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
                        `Validation timeout (${timeout}ms). Service may be busy. Try increasing the timeout.`,
                        'VALIDATION_TIMEOUT'
                    );
                }
                if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                    throw new z.errors.Error(
                        'Cannot connect to validation service. Check your internet connection.',
                        'NETWORK_ERROR'
                    );
                }
                throw error;
            }

            switch (response.status) {
                case 200:
                    break; // Success
                case 400:
                    throw new z.errors.Error(
                        'Invalid request: verify email format',
                        'VALIDATION_ERROR'
                    );
                case 401:
                    throw new z.errors.Error(
                        'Invalid authentication. Check your API Key or JWT Token',
                        'AUTHENTICATION_FAILED'
                    );
                case 403:
                    throw new z.errors.Error(
                        'Access denied. Your plan does not include this feature',
                        'PLAN_LIMITATION'
                    );
                case 404:
                    throw new z.errors.Error(
                        'Endpoint not found. Contact technical support',
                        'ENDPOINT_NOT_FOUND'
                    );
                case 429:
                    throw new z.errors.RateLimitError(
                        'Rate limit exceeded. Please wait before performing more validations',
                        'RATE_LIMIT_EXCEEDED'
                    );
                case 500:
                case 502:
                case 503:
                    throw new z.errors.Error(
                        'Service temporarily unavailable. Please try again in a few minutes',
                        'SERVICE_UNAVAILABLE'
                    );
                default:
                    throw new z.errors.Error(
                        `Unexpected error: ${response.status} - ${response.json?.detail || 'Contact support'}`,
                        'UNKNOWN_ERROR'
                    );
            }

            const result = response.json;

            if (!result || typeof result !== 'object') {
                throw new z.errors.Error('Invalid API response', 'INVALID_API_RESPONSE');
            }

            if (!result.email) {
                throw new z.errors.Error(
                    'API response is missing the email field',
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

            return enrichedResult;
        },

        sample: {
            id: 'val_123456789',
            email: 'user@example.com',
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
            { key: 'email', label: 'Validated Email', type: 'string' },
            { key: 'valid', label: 'Valid', type: 'boolean' },
            { key: 'status', label: 'Deliverability Status', type: 'string' },
            { key: 'detail', label: 'Result Detail', type: 'string' },
            { key: 'risk_score', label: 'Risk Score (0-1)', type: 'number' },
            { key: 'quality_score', label: 'Quality Score (0-1)', type: 'number' },
            { key: 'processing_time', label: 'Processing Time (seconds)', type: 'number' },
            { key: 'deliverability_status', label: 'Deliverability Level', type: 'string' },
            { key: 'risk_level', label: 'Risk Level', type: 'string' },
            { key: 'quality_tier', label: 'Quality Tier', type: 'string' },
            { key: 'is_high_risk', label: 'High Risk', type: 'boolean' },
            { key: 'is_premium_provider', label: 'Premium Provider', type: 'boolean' },
            { key: 'has_security_records', label: 'Has Security Records', type: 'boolean' },
            { key: 'provider_analysis__provider', label: 'Email Provider', type: 'string' },
            {
                key: 'provider_analysis__reputation',
                label: 'Provider Reputation',
                type: 'number',
            },
            { key: 'provider_analysis__fingerprint', label: 'Provider Fingerprint', type: 'string' },
            { key: 'smtp_validation__checked', label: 'SMTP Verified', type: 'boolean' },
            { key: 'smtp_validation__mailbox_exists', label: 'Mailbox Exists', type: 'boolean' },
            { key: 'smtp_validation__mx_server', label: 'MX Server', type: 'string' },
            { key: 'smtp_validation__detail', label: 'SMTP Detail', type: 'string' },
            { key: 'dns_security__spf__status', label: 'SPF Status', type: 'string' },
            { key: 'dns_security__dkim__status', label: 'DKIM Status', type: 'string' },
            { key: 'dns_security__dmarc__status', label: 'DMARC Status', type: 'string' },
            { key: 'spam_trap_check__checked', label: 'Spam Trap Checked', type: 'boolean' },
            { key: 'spam_trap_check__is_spam_trap', label: 'Is Spam Trap', type: 'boolean' },
            { key: 'spam_trap_check__confidence', label: 'Spam Confidence', type: 'number' },
            { key: 'spam_trap_check__trap_type', label: 'Spam Trap Type', type: 'string' },
            { key: 'metadata__validation_id', label: 'Validation ID', type: 'string' },
            { key: 'metadata__cache_used', label: 'Cache Used', type: 'boolean' },
            { key: 'client_plan', label: 'Client Plan', type: 'string' },
            { key: 'validated_at', label: 'Validated At', type: 'datetime' },
        ],
    },
};

module.exports = validateEmailCreate;
