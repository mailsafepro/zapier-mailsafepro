/**
 * @module SuppressionListDropdownTest
 * @description Tests for suppression list dropdown trigger
 */

const suppressionListDropdown = require('../../triggers/suppression_list_dropdown');

// Mock z object
const createMockZ = (responseOverrides = {}) => ({
  request: jest.fn().mockResolvedValue({
    status: 200,
    json: {
      lists: [
        { id: 'default', name: 'Default Suppression List' },
        { id: 'marketing', name: 'Marketing Suppression List' },
        { id: 'transactional', name: 'Transactional Suppression List' },
      ],
    },
    ...responseOverrides,
  }),
  console: {
    log: jest.fn(),
    error: jest.fn(),
  },
  errors: {
    Error: class ZapierError extends Error {
      constructor(message, code, status) {
        super(message);
        this.name = 'Error';
        this.code = code;
        this.status = status;
      }
    },
  },
});

// Mock bundle
const createMockBundle = (overrides = {}) => ({
  authData: {
    apiKey: 'test_api_key_12345678901234567890',
    ...overrides.authData,
  },
  inputData: {
    ...overrides.inputData,
  },
  meta: {
    ...overrides.meta,
  },
});

describe('SuppressionListDropdown Trigger', () => {
  describe('Module Structure', () => {
    it('should have correct key', () => {
      expect(suppressionListDropdown.key).toBe('suppression_list_dropdown');
    });

    it('should have correct noun', () => {
      expect(suppressionListDropdown.noun).toBe('Suppression List');
    });

    it('should be hidden', () => {
      expect(suppressionListDropdown.display.hidden).toBe(true);
    });

    it('should have display label and description', () => {
      expect(suppressionListDropdown.display.label).toBe('Suppression List');
      expect(suppressionListDropdown.display.description).toContain('suppression lists');
    });

    it('should have perform function', () => {
      expect(typeof suppressionListDropdown.operation.perform).toBe('function');
    });

    it('should have sample data', () => {
      expect(suppressionListDropdown.operation.sample).toBeDefined();
      expect(suppressionListDropdown.operation.sample.id).toBeDefined();
      expect(suppressionListDropdown.operation.sample.name).toBeDefined();
    });

    it('should have output fields', () => {
      expect(suppressionListDropdown.operation.outputFields).toBeDefined();
      expect(suppressionListDropdown.operation.outputFields.length).toBeGreaterThan(0);
    });
  });

  describe('perform function', () => {
    it('should return suppression lists from API', async () => {
      const z = createMockZ();
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.mailsafepro.es/suppression/lists',
          method: 'GET',
        })
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should include API key header when using API key auth', async () => {
      const z = createMockZ();
      const bundle = createMockBundle({ authData: { apiKey: 'my_api_key' } });

      await suppressionListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'my_api_key',
          }),
        })
      );
    });

    it('should include JWT header when using JWT auth', async () => {
      const z = createMockZ();
      const bundle = createMockBundle({
        authData: { jwt: 'my_jwt_token', apiKey: undefined },
      });

      await suppressionListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my_jwt_token',
          }),
        })
      );
    });

    it('should return default lists on API error', async () => {
      const z = createMockZ({ status: 500 });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('default');
      expect(result[1].id).toBe('marketing');
      expect(result[2].id).toBe('transactional');
      expect(result[3].id).toBe('global');
    });

    it('should return default lists on 401 error', async () => {
      const z = createMockZ({ status: 401 });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('default');
    });

    it('should return default lists on 403 error', async () => {
      const z = createMockZ({ status: 403 });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(4);
    });

    it('should return default lists when API returns empty array', async () => {
      const z = createMockZ({ json: { lists: [] } });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('default');
    });

    it('should handle network errors gracefully', async () => {
      const z = {
        request: jest.fn().mockRejectedValue(new Error('Network error')),
        console: { log: jest.fn(), error: jest.fn() },
      };
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('default');
    });

    it('should map list_id to id correctly', async () => {
      const z = createMockZ({
        json: {
          lists: [{ list_id: 'custom_list', list_name: 'Custom List' }],
        },
      });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result[0].id).toBe('custom_list');
      expect(result[0].name).toBe('Custom List');
    });

    it('should handle response without lists wrapper', async () => {
      const z = createMockZ({
        json: [
          { id: 'list1', name: 'List 1' },
          { id: 'list2', name: 'List 2' },
        ],
      });
      const bundle = createMockBundle();

      const result = await suppressionListDropdown.operation.perform(z, bundle);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('list1');
    });

    it('should include User-Agent header', async () => {
      const z = createMockZ();
      const bundle = createMockBundle();

      await suppressionListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Zapier-MailSafePro/2.0.0',
          }),
        })
      );
    });

    it('should set timeout', async () => {
      const z = createMockZ();
      const bundle = createMockBundle();

      await suppressionListDropdown.operation.perform(z, bundle);

      expect(z.request).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000,
        })
      );
    });
  });

  describe('Output Fields', () => {
    it('should have id field', () => {
      const idField = suppressionListDropdown.operation.outputFields.find(f => f.key === 'id');
      expect(idField).toBeDefined();
      expect(idField.type).toBe('string');
    });

    it('should have name field', () => {
      const nameField = suppressionListDropdown.operation.outputFields.find(f => f.key === 'name');
      expect(nameField).toBeDefined();
      expect(nameField.type).toBe('string');
    });
  });

  describe('Sample Data', () => {
    it('should have valid sample', () => {
      const sample = suppressionListDropdown.operation.sample;
      expect(sample.id).toBe('default');
      expect(sample.name).toBe('Default Suppression List');
    });
  });
});
