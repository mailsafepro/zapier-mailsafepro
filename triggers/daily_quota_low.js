/**
 * @module DailyQuotaLowTrigger
 * @description Polling trigger for daily quota warnings.
 * Notifies the user when their daily plan quota is running low.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const dailyQuotaLowTrigger = {
    key: 'daily_quota_low',
    noun: 'Quota Alert',
    display: {
        label: 'Daily Quota Running Low',
        description: 'Triggers when your daily validation quota falls below a specified percentage remaining.',
    },

    operation: {
        inputFields: [
            {
                key: 'percentage_threshold',
                type: 'integer',
                required: true,
                label: 'Percentage Threshold (%)',
                helpText: 'Trigger the Zap when remaining quota is less than this percentage of the daily limit.',
                default: '10',
            },
        ],

        perform: async (z, bundle) => {
            const response = await z.request({
                url: 'https://api.mailsafepro.es/validate/stats/usage',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Zapier-MailSafePro/2.0.0',
                    ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
                    ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
                },
            });

            if (response.status >= 400) {
                throw new Error(`Failed to fetch usage stats: ${response.status}`);
            }

            const stats = response.json;
            const threshold = parseInt(bundle.inputData.percentage_threshold || 10, 10);
            const remaining_pct = (stats.remaining_today / stats.daily_limit) * 100;

            if (remaining_pct <= threshold) {
                const id = `quota_low_${bundle.authData.email || 'user'}_${new Date().toISOString().split('T')[0]}`;

                return [{
                    id,
                    plan: stats.plan,
                    usage_today: stats.usage_today,
                    daily_limit: stats.daily_limit,
                    remaining_today: stats.remaining_today,
                    usage_percentage: stats.usage_percentage,
                    remaining_percentage: Math.round(remaining_pct),
                    message: `Your daily MailSafePro quota is low: ${stats.remaining_today} validations remaining (${Math.round(remaining_pct)}%).`,
                    checked_at: new Date().toISOString(),
                }];
            }

            return [];
        },

        sample: {
            id: 'quota_2026-02-15',
            plan: 'PROFESSIONAL',
            usage_today: 0,
            daily_limit: 10000,
            remaining_today: 10000,
            usage_percentage: 0,
            remaining_percentage: 100,
            message: 'Your daily MailSafePro quota is low: 10000 validations remaining (100%).',
            checked_at: '2026-02-15T12:00:00Z',
        },

        outputFields: [
            { key: 'id', label: 'Alert ID', type: 'string' },
            { key: 'plan', label: 'Current Plan', type: 'string' },
            { key: 'usage_today', label: 'Used Today', type: 'integer' },
            { key: 'daily_limit', label: 'Daily Limit', type: 'integer' },
            { key: 'remaining_today', label: 'Remaining Today', type: 'integer' },
            { key: 'usage_percentage', label: 'Usage %', type: 'number' },
            { key: 'remaining_percentage', label: 'Remaining %', type: 'integer' },
            { key: 'message', label: 'Alert Message', type: 'string' },
            { key: 'checked_at', label: 'Checked At', type: 'datetime' },
        ],
    },
};

module.exports = dailyQuotaLowTrigger;
