/**
 * @module BatchListDropdown
 * @description Hidden trigger for batch list dynamic dropdown.
 * Provides a list of recent batches for selection in other actions/searches.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const batchListDropdown = {
  key: 'batch_list_dropdown',
  noun: 'Batch',
  display: {
    label: 'Batch List',
    description: 'List of recent batches for dropdown selection',
    hidden: true,
  },

  operation: {
    perform: async (z, bundle) => {
      const response = await z.request({
        url: 'https://api.mailsafepro.es/jobs',
        method: 'GET',
        params: {
          limit: 50,
        },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zapier-MailSafePro/2.0.0',
          ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
          ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
        },
        timeout: 15000,
      });

      if (response.status >= 400) {
        // Return sample data if API fails
        return [
          {
            id: 'batch_sample_123456',
            job_id: 'batch_sample_123456',
            name: 'Sample Batch (100 emails)',
          },
        ];
      }

      const batches = response.json?.jobs || response.json || [];

      return batches.map(batch => ({
        id: batch.job_id,
        job_id: batch.job_id,
        name: `${batch.batch_name || 'Unnamed Batch'} (${batch.status}) - ${batch.total_emails || 0} emails`,
      }));
    },

    sample: {
      id: 'batch_550e8400-e29b-41d4-a716-446655440000',
      job_id: 'batch_550e8400-e29b-41d4-a716-446655440000',
      name: 'Sample Batch (completed) - 500 emails',
    },

    outputFields: [
      { key: 'id', label: 'Batch ID', type: 'string' },
      { key: 'job_id', label: 'Job ID', type: 'string' },
      { key: 'name', label: 'Batch Name', type: 'string' },
    ],
  },
};

module.exports = batchListDropdown;
