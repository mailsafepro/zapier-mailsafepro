/**
 * @module AddToSuppressionListCreate
 * @description Action para añadir un email a una lista de supresión.
 * Previene futuras validaciones de emails no deseados.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const addToSuppressionListCreate = {
  key: 'add_to_suppression_list',
  noun: 'Suppressed Email',
  display: {
    label: 'Add to Suppression List',
    description: 'Add an email to a suppression list to prevent future validations.',
  },

  operation: {
    inputFields: [
      {
        key: 'email',
        type: 'string',
        required: true,
        label: 'Email',
        helpText: 'Email address to add to suppression list',
      },
      {
        key: 'list_id',
        type: 'string',
        required: false,
        label: 'Suppression List',
        helpText: 'Select a suppression list or leave blank for default',
        dynamic: 'suppression_list_dropdown.id.name',
        default: 'default',
      },
      {
        key: 'reason',
        type: 'string',
        required: false,
        label: 'Reason',
        helpText: 'Reason for adding to suppression list',
        choices: {
          spam_trap: 'Spam Trap',
          bounce: 'Bounced Email',
          complaint: 'User Complaint',
          unsubscribe: 'Unsubscribe Request',
          disposable: 'Disposable Email',
          role_based: 'Role-based Email',
          invalid_format: 'Invalid Format',
          other: 'Other',
        },
        default: 'other',
      },
      {
        key: 'notes',
        type: 'string',
        required: false,
        label: 'Notes',
        helpText: 'Additional notes about this suppression',
      },
      {
        key: 'permanent',
        type: 'boolean',
        required: false,
        default: 'false',
        label: 'Permanent Suppression',
        helpText: 'If true, email will never be removed from suppression',
      },
    ],

    perform: async (z, bundle) => {
      const { email, list_id, reason, notes, permanent } = bundle.inputData;

      if (!email || !email.trim()) {
        throw new z.errors.Error('Email is required', 'MISSING_EMAIL');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new z.errors.Error('Invalid email format', 'INVALID_EMAIL');
      }

      try {
        const response = await z.request({
          url: 'https://api.mailsafepro.es/suppression/add',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          body: {
            email: email.trim(),
            list_id: list_id || 'default',
            reason: reason || 'other',
            notes,
            permanent: !!permanent,
          },
          timeout: 10000,
        });

        switch (response.status) {
          case 200:
          case 201:
            break;
          case 400:
            throw new z.errors.Error('Invalid request parameters', 'INVALID_REQUEST');
          case 401:
            throw new z.errors.Error('Authentication failed', 'AUTH_FAILED');
          case 403:
            throw new z.errors.Error('Insufficient permissions', 'FORBIDDEN');
          case 409:
            throw new z.errors.Error('Email already in suppression list', 'ALREADY_SUPPRESSED');
          case 429:
            throw new z.errors.RateLimitError('Rate limit exceeded. Please wait before trying again.');
          default:
            throw new z.errors.Error(`Server error: ${response.status}`, 'SERVER_ERROR');
        }

        const result = response.json;

        return {
          ...result,
          suppressed_at: new Date().toISOString(),
          is_permanent: !!permanent,
        };
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
      id: 'supp_123456789',
      email: 'blocked@example.com',
      list_id: 'default',
      reason: 'spam_trap',
      notes: 'Detected as honeypot',
      suppressed_at: '2024-01-15T12:00:00.000Z',
      is_permanent: false,
    },

    outputFields: [
      { key: 'id', label: 'Suppression ID', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'list_id', label: 'Suppression List ID', type: 'string' },
      { key: 'reason', label: 'Reason', type: 'string' },
      { key: 'notes', label: 'Notes', type: 'string' },
      { key: 'suppressed_at', label: 'Suppressed At', type: 'datetime' },
      { key: 'is_permanent', label: 'Is Permanent', type: 'boolean' },
    ],
  },
};

module.exports = addToSuppressionListCreate;
