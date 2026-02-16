const validateEmailCreate = require('../../creates/validate_email');
const { createMockBundle, createMockResponse, mockZapier } = require('../mocks/zapier-mocks');
const { mockEmailValidationResponse, mockErrorResponses } = require('../mocks/api-responses');

describe('Email Validation Create Action', () => {
    let z;
    let bundle;

    beforeEach(() => {
        z = { ...mockZapier };
        bundle = createMockBundle();
        jest.clearAllMocks();
    });

    describe('display', () => {
        it('should have correct display properties', () => {
            expect(validateEmailCreate.key).toBe('validate_email_action');
            expect(validateEmailCreate.noun).toBe('Email Validation');
            expect(validateEmailCreate.display.label).toBe('Validate Email');
        });
    });

    describe('inputFields', () => {
        it('should have correct input field structure', () => {
            const inputFields = validateEmailCreate.operation.inputFields;

            expect(inputFields).toBeInstanceOf(Array);
            expect(inputFields[0]).toMatchObject({
                key: 'email',
                type: 'string',
                required: true,
            });
            expect(inputFields[0].label).toBe('Email to Validate');
        });
    });

    describe('perform', () => {
        it('should validate email successfully with API Key', async () => {
            bundle.inputData = {
                email: 'test@example.com',
                check_smtp: true,
                include_raw_dns: false,
                validation_timeout: 30,
            };
            bundle.authData = { apiKey: 'sk_test_key' };

            z.request.mockResolvedValue(
                createMockResponse({
                    status: 200,
                    json: mockEmailValidationResponse,
                })
            );

            const result = await validateEmailCreate.operation.perform(z, bundle);

            // Verify result structure (Object, not Array for Creates usually, but let's check return)
            // The implementation returns an object directly? No, perform usually returns object or promise.
            // Wait, perform returned `enrichedResult`. Is it array or object?
            // In Zapier Actions (Creates), perform ideally returns an Object.
            // However, if it returns an Array, Zapier might take the first element or process it.
            // Triggers MUST return Array. Creates SHOULD return Object (typically).
            // Let's check my implementation of creates/validate_email.js.
            // "return enrichedResult;" -> It returns an Object.
            // Wait, let me check the implementation I wrote.
            // I wrote: "return enrichedResult;" NO wait.
            // Let me re-read the implementation block I wrote in previous turn.
            // "return enrichedResult;"
            // In triggers/validate_email.js it was "return [enrichedResult];".
            // Good. Creates return Objects.

            expect(result).toMatchObject({
                email: 'test@example.com',
                valid: true,
                status: 'deliverable',
                deliverability_status: 'high',
                risk_level: 'low',
                quality_tier: 'excellent',
                is_high_risk: false,
                is_premium_provider: true,
                has_security_records: true,
            });

            expect(z.request).toHaveBeenCalledWith({
                url: 'https://api.mailsafepro.es/validate/email',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Zapier-MailSafePro/2.0.0',
                    'X-Client-Version': '2.0.0',
                    'X-API-Key': 'sk_test_key',
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    check_smtp: true,
                    include_raw_dns: false,
                }),
                timeout: 30000,
            });
        });

        // ... (Add more tests similar to trigger but expecting Object) ...

        it('should fail when email is missing', async () => {
            bundle.inputData = {
                email: '   ',
                validation_timeout: 30,
            };

            await expect(validateEmailCreate.operation.perform(z, bundle)).rejects.toThrow(
                'Email field is required'
            );
        });
    });
});
