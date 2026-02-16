/**
 * Unit tests for dynamic dropdowns
 */

const dynamicDropdowns = require('../../lib/dynamic-dropdowns');

describe('Dynamic Dropdowns', () => {
  let z;
  let bundle;

  beforeEach(() => {
    z = {
      request: jest.fn(),
    };
    bundle = {
      authData: {
        apiKey: 'test_api_key',
      },
    };
  });

  describe('getBatchList', () => {
    it('should return list of batches successfully', async () => {
      const mockResponse = {
        status: 200,
        json: {
          batches: [
            {
              job_id: 'batch_1',
              batch_name: 'Test Batch',
              status: 'completed',
              total_emails: 100,
            },
            {
              job_id: 'batch_2',
              batch_name: 'Another Batch',
              status: 'processing',
              total_emails: 50,
            },
          ],
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await dynamicDropdowns.getBatchList(z, bundle);

      expect(z.request).toHaveBeenCalledWith({
        url: 'https://api.mailsafepro.es/validate/batch/history',
        method: 'GET',
        params: {
          limit: 50,
          status: 'all',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test_api_key',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'batch_1',
        name: 'Test Batch (completed) - 100 emails',
      });
      expect(result[1]).toEqual({
        id: 'batch_2',
        name: 'Another Batch (processing) - 50 emails',
      });
    });

    it('should return empty array on error', async () => {
      const mockResponse = {
        status: 401,
        json: { error: 'Unauthorized' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await dynamicDropdowns.getBatchList(z, bundle);

      expect(result).toEqual([]);
    });

    it('should handle missing batch_name', async () => {
      const mockResponse = {
        status: 200,
        json: {
          batches: [
            {
              job_id: 'batch_1',
              status: 'completed',
              total_emails: 100,
            },
          ],
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await dynamicDropdowns.getBatchList(z, bundle);

      expect(result[0].name).toBe('Unnamed Batch (completed) - 100 emails');
    });
  });

  describe('getSuppressionLists', () => {
    it('should return list of suppression lists', async () => {
      const mockResponse = {
        status: 200,
        json: {
          lists: [
            {
              list_id: 'list_1',
              name: 'Global Suppression',
              total_emails: 1000,
            },
            {
              list_id: 'list_2',
              name: 'Marketing List',
              total_emails: 500,
            },
          ],
        },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await dynamicDropdowns.getSuppressionLists(z, bundle);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'list_1',
        name: 'Global Suppression (1000 emails)',
      });
    });

    it('should return default list on error', async () => {
      const mockResponse = {
        status: 404,
        json: { error: 'Not found' },
      };

      z.request.mockResolvedValueOnce(mockResponse);

      const result = await dynamicDropdowns.getSuppressionLists(z, bundle);

      expect(result).toEqual([
        {
          id: 'default',
          name: 'Default Suppression List',
        },
      ]);
    });
  });

  describe('getPriorityOptions', () => {
    it('should return priority options', () => {
      const result = dynamicDropdowns.getPriorityOptions();

      expect(result).toEqual([
        { id: 'low', name: 'Low (Slow - up to 24h)' },
        { id: 'normal', name: 'Normal (Standard - up to 6h)' },
        { id: 'high', name: 'High (Fast - up to 1h, Enterprise only)' },
      ]);
    });
  });

  describe('getStatusFilters', () => {
    it('should return status filters', () => {
      const result = dynamicDropdowns.getStatusFilters();

      expect(result).toEqual([
        { id: 'all', name: 'All Statuses' },
        { id: 'valid', name: 'Valid Only' },
        { id: 'invalid', name: 'Invalid Only' },
        { id: 'risky', name: 'Risky Only' },
        { id: 'unknown', name: 'Unknown Only' },
      ]);
    });
  });

  describe('getSpamTrapTypes', () => {
    it('should return spam trap types', () => {
      const result = dynamicDropdowns.getSpamTrapTypes();

      expect(result).toEqual([
        { id: 'honeypot', name: 'Honeypot' },
        { id: 'spamtrap', name: 'Classic Spam Trap' },
        { id: 'pristine', name: 'Pristine Trap' },
        { id: 'recycled', name: 'Recycled Trap' },
        { id: 'role_based', name: 'Role-based Email' },
      ]);
    });
  });

  describe('getSuppressionReasons', () => {
    it('should return suppression reasons', () => {
      const result = dynamicDropdowns.getSuppressionReasons();

      expect(result).toEqual([
        { id: 'spam_trap', name: 'Spam Trap' },
        { id: 'bounce', name: 'Bounced Email' },
        { id: 'complaint', name: 'User Complaint' },
        { id: 'unsubscribe', name: 'Unsubscribe Request' },
        { id: 'disposable', name: 'Disposable Email' },
        { id: 'role_based', name: 'Role-based Email' },
        { id: 'invalid_format', name: 'Invalid Format' },
        { id: 'other', name: 'Other' },
      ]);
    });
  });
});
