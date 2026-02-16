/**
 * @module NewBatchPollingTrigger
 * @description Polling version of the batch completed trigger.
 * Useful for users who cannot use webhooks.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const newBatchPollingTrigger = {
    key: 'new_batch_completed_polling',
    noun: 'Batch',
    display: {
        label: 'New Batch Completed (Polling)',
        description: 'Triggers when a validation batch is completed (Polling version).',
    },

    operation: {
        perform: async (z, bundle) => {
            const response = await z.request({
                url: 'https://api.mailsafepro.es/jobs',
                method: 'GET',
                params: {
                    status: 'completed',
                    limit: 10,
                },
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Zapier-MailSafePro/2.0.0',
                    ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
                    ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
                },
            });

            if (response.status >= 400) {
                throw new Error(`Failed to fetch batches: ${response.status}`);
            }

            const batches = response.json.jobs || response.json.batches || response.json || [];

            return batches.map(batch => ({
                ...batch,
                id: batch.job_id,
                received_at: batch.finished_at || batch.completed_at || new Date().toISOString(),
            }));
        },

        sample: {
            id: '16a19fd2-9616-4bab-b103-cd8f7374bbc6',
            job_id: '16a19fd2-9616-4bab-b103-cd8f7374bbc6',
            status: 'completed',
            created_at: '2026-02-04T22:10:51.100640+00:00',
            total_emails: 2,
            batch_name: 'Pro Schema Verification',
        },

        outputFields: [
            { key: 'id', label: 'Batch ID' },
            { key: 'job_id', label: 'Job ID' },
            { key: 'status', label: 'Status' },
            { key: 'batch_name', label: 'Batch Name' },
            { key: 'total_emails', label: 'Total Emails', type: 'integer' },
            { key: 'created_at', label: 'Created At', type: 'datetime' },
            { key: 'finished_at', label: 'Finished At', type: 'datetime' },
        ],
    },
};

module.exports = newBatchPollingTrigger;
