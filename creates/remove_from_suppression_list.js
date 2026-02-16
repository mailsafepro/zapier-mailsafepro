/**
 * @module RemoveFromSuppressionListCreate
 * @description Action para remover un email de una lista de supresión.
 * Permite re-validar emails previamente suprimidos.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const removeFromSuppressionListCreate = {
  key: 'remove_from_suppression_list',
  noun: 'Removed Email',
  display: {
    label: 'Remove From Suppression List',
    description: 'Remove an email from a suppression list.',
  },

  operation: {
    inputFields: [
      {
        key: 'email',
        type: 'string',
        required: true,
        label: 'Email',
        helpText: 'Email address to remove from suppression list',
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
        helpText: 'Reason for removing from suppression list',
        placeholder: 'User reactivated account',
      },
    ],

    perform: async (z, bundle) => {
      const { email, list_id, reason } = bundle.inputData;

      if (!email || !email.trim()) {
        throw new z.errors.Error('Email is required', 'MISSING_EMAIL');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new z.errors.Error('Invalid email format', 'INVALID_EMAIL');
      }

      try {
        const response = await z.request({
          url: 'https://api.mailsafepro.es/suppression/remove',
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
            reason,
          },
          timeout: 10000,
        });

        switch (response.status) {
          case 200:
          case 204:
            break;
          case 400:
            throw new z.errors.Error('Invalid request parameters', 'INVALID_REQUEST');
          case 401:
            throw new z.errors.Error('Authentication failed', 'AUTH_FAILED');
          case 403:
            throw new z.errors.Error('Insufficient permissions', 'FORBIDDEN');
          case 404:
            throw new z.errors.Error('Email not found in suppression list', 'NOT_FOUND');
          case 429:
            throw new z.errors.RateLimitError('Rate limit exceeded. Please wait before trying again.');
          default:
            throw new z.errors.Error(`Server error: ${response.status}`, 'SERVER_ERROR');
        }

        return {
          success: true,
          email: email.trim(),
          list_id: list_id || 'default',
          removed_at: new Date().toISOString(),
          reason,
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
      success: true,
      email: 'previously-blocked@example.com',
      list_id: 'default',
      removed_at: '2024-01-15T12:30:00.000Z',
      reason: 'User reactivated account',
    },

    outputFields: [
      { key: 'success', label: 'Success', type: 'boolean' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'list_id', label: 'Suppression List ID', type: 'string' },
      { key: 'removed_at', label: 'Removed At', type: 'datetime' },
      { key: 'reason', label: 'Reason', type: 'string' },
    ],
  },
};

module.exports = removeFromSuppressionListCreate;
