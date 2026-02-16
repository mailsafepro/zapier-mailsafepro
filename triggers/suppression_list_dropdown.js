/**
 * @module SuppressionListDropdown
 * @description Hidden trigger for suppression list dynamic dropdown.
 * Provides a list of available suppression lists for selection in other actions.
 * @version 2.0.0
 * @author MailSafePro Team
 */

const suppressionListDropdown = {
  key: 'suppression_list_dropdown',
  noun: 'Suppression List',
  display: {
    label: 'Suppression List',
    description: 'List of available suppression lists for dropdown selection',
    hidden: true,
  },

  operation: {
    perform: async (z, bundle) => {
      try {
        const response = await z.request({
          url: 'https://api.mailsafepro.es/suppression/lists',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
            ...(bundle.authData.apiKey ? { 'X-API-Key': bundle.authData.apiKey } : {}),
            ...(bundle.authData.jwt ? { Authorization: `Bearer ${bundle.authData.jwt}` } : {}),
          },
          timeout: 15000,
        });

        if (response.status >= 400) {
          // Return default lists if API fails
          return [
            { id: 'default', name: 'Default Suppression List' },
            { id: 'marketing', name: 'Marketing Suppression List' },
            { id: 'transactional', name: 'Transactional Suppression List' },
            { id: 'global', name: 'Global Suppression List' },
          ];
        }

        const lists = response.json?.lists || response.json || [];

        if (lists.length === 0) {
          return [
            { id: 'default', name: 'Default Suppression List' },
            { id: 'marketing', name: 'Marketing Suppression List' },
            { id: 'transactional', name: 'Transactional Suppression List' },
            { id: 'global', name: 'Global Suppression List' },
          ];
        }

        return lists.map(list => ({
          id: list.id || list.list_id,
          name: list.name || list.list_name || `List ${list.id}`,
        }));
      } catch (error) {
        // Return default lists on error
        return [
          { id: 'default', name: 'Default Suppression List' },
          { id: 'marketing', name: 'Marketing Suppression List' },
          { id: 'transactional', name: 'Transactional Suppression List' },
          { id: 'global', name: 'Global Suppression List' },
        ];
      }
    },

    sample: {
      id: 'default',
      name: 'Default Suppression List',
    },

    outputFields: [
      { key: 'id', label: 'List ID', type: 'string' },
      { key: 'name', label: 'List Name', type: 'string' },
    ],
  },
};

module.exports = suppressionListDropdown;
