const mockEmailValidationResponse = {
  email: 'test@example.com',
  valid: true,
  status: 'deliverable',
  detail: 'Email format and domain are valid',
  processing_time: 1.2345,
  risk_score: 0.15,
  quality_score: 0.89,
  validation_tier: 'premium',
  suggested_action: 'accept',
  provider_analysis: {
    provider: 'google',
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
    spf: { status: 'valid' },
    dkim: { status: 'valid' },
    dmarc: { status: 'valid' },
  },
  spam_trap_check: {
    checked: true,
    is_spam_trap: false,
    confidence: 0.05,
    trap_type: 'none',
  },
  metadata: {
    validation_id: 'test_validation_123',
    cache_used: false,
  },
  client_plan: 'PREMIUM',
};

const mockBatchCreateResponse = {
  job_id: 'batch_test_123456',
  status: 'processing',
  submitted_at: '2024-01-15T10:00:00.000Z',
  estimated_completion_time: '2024-01-15T10:30:00.000Z',
  total_emails_estimated: 100,
  tracking_url: 'https://api.mailsafepro.com/v1/validate/batch/batch_test_123456/status',
  queue_position: 5,
};

const mockBatchStatusResponse = {
  job_id: 'batch_test_123456',
  status: 'completed',
  progress: 100,
  total_emails: 100,
  processed_emails: 100,
  valid_emails: 85,
  invalid_emails: 15,
  started_at: '2024-01-15T10:00:00.000Z',
  finished_at: '2024-01-15T10:25:00.000Z',
  processing_time: 1500,
  metrics: {
    overall_quality_score: 0.82,
    average_risk_score: 0.18,
    deliverability_rate: 0.85,
  },
};

const mockUsageResponse = {
  plan: 'PREMIUM',
  usage_today: 1250,
  daily_limit: 10000,
  remaining_today: 8750,
  usage_percentage: 12.5,
  monthly_usage: 28500,
  monthly_limit: 300000,
  monthly_remaining: 271500,
  monthly_percentage: 9.5,
  analytics: {
    average_daily_usage: 950,
    peak_usage_day: '2024-01-10',
    usage_trend: 'stable',
  },
};

const mockAuthResponse = {
  access_token: 'new.jwt.token.xyz',
  refresh_token: 'new.refresh.token.abc',
  expires_in: 3600,
  token_type: 'bearer',
};

const mockErrorResponses = {
  400: { status: 400, json: { detail: 'Bad Request', error_type: 'VALIDATION_ERROR' } },
  401: { status: 401, json: { detail: 'Unauthorized', error_type: 'AUTH_FAILED' } },
  403: { status: 403, json: { detail: 'Forbidden', error_type: 'ACCESS_DENIED' } },
  429: { status: 429, json: { detail: 'Rate Limit Exceeded', error_type: 'RATE_LIMIT' } },
  500: { status: 500, json: { detail: 'Internal Server Error', error_type: 'SERVER_ERROR' } },
};

module.exports = {
  mockEmailValidationResponse,
  mockBatchCreateResponse,
  mockBatchStatusResponse,
  mockUsageResponse,
  mockAuthResponse,
  mockErrorResponses,
};
