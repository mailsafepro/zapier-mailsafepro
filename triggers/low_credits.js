/**
 * @module LowCreditsTrigger
 * @description Polling trigger for low credit alerts.
 * Notifies the user when their credit balance falls below a threshold.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const lowCreditsTrigger = {
    key: 'low_credits_alert',
    noun: 'Credit Alert',
    display: {
        label: 'Low Credits Alert',
        description: 'Triggers when your available credits fall below a specified threshold.',
    },

    operation: {
        inputFields: [
            {
                key: 'threshold',
                type: 'integer',
                required: true,
                label: 'Credit Threshold',
                helpText: 'Trigger the Zap when available credits are less than this number.',
                default: '100',
            },
        ],

        perform: async (z, bundle) => {
            const response = await z.request({
                url: 'https://api.mailsafepro.es/credits/balance',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Zapier-MailSafePro/2.0.0',
                    ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
                    ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
                },
            });

            if (response.status >= 400) {
                throw new Error(`Failed to fetch credit balance: ${response.status}`);
            }

            const balance = response.json.available;
            const threshold = parseInt(bundle.inputData.threshold || 100, 10);

            if (balance <= threshold) {
                // Return a single object in an array for Zapier polling
                // Note: Polling triggers expect a deduplication ID. 
                // We'll use a combination of user_id and day to avoid frequent triggers for the same threshold.
                const id = `low_credit_${bundle.authData.email || 'user'}_${balance}_${new Date().toISOString().split('T')[0]}`;

                return [{
                    id,
                    balance,
                    available: response.json.available,
                    reserved: response.json.reserved,
                    threshold,
                    message: `Your MailSafePro balance is low: ${balance} credits remaining.`,
                    checked_at: new Date().toISOString(),
                }];
            }

            return [];
        },

        sample: {
            id: 'low_credits_2026-02-15',
            balance: 0,
            available: 0,
            reserved: 0,
            threshold: 100,
            message: 'Your MailSafePro balance is low: 0 credits remaining.',
            checked_at: '2026-02-15T12:00:00Z',
        },

        outputFields: [
            { key: 'id', label: 'Alert ID', type: 'string' },
            { key: 'balance', label: 'Current Balance', type: 'integer' },
            { key: 'available', label: 'Available Credits', type: 'integer' },
            { key: 'reserved', label: 'Reserved Credits', type: 'integer' },
            { key: 'threshold', label: 'Threshold', type: 'integer' },
            { key: 'message', label: 'Alert Message', type: 'string' },
            { key: 'checked_at', label: 'Checked At', type: 'datetime' },
        ],
    },
};

module.exports = lowCreditsTrigger;
