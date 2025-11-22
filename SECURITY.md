# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**⚠️ Please do not report security vulnerabilities through public GitHub
issues.**

Instead, please report security vulnerabilities via email to:

**mailsafepro1@gmail.com**

Include the following information:

- Type of vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 3-7 days
  - Medium: 7-14 days
  - Low: 14-30 days

## Security Best Practices

### For Users

1. **API Key Security**

   - Never commit API keys to version control
   - Rotate keys regularly
   - Use environment variables
   - Restrict key permissions

2. **JWT Tokens**

   - Tokens auto-refresh before expiry
   - Never share refresh tokens
   - Monitor for unauthorized access

3. **Environment Variables**

   ```bash
   # Development
   MAILSAFEPRO_API_KEY=sk_test_...

   # Production
   MAILSAFEPRO_API_KEY=sk_live_...
   ```

### For Contributors

1. **Code Security**

   - No hardcoded secrets
   - Input validation on all user data
   - Sanitize logs (use `sanitizeForLogging`)
   - Use HTTPS only

2. **Dependencies**

   - Keep dependencies updated
   - Run `npm audit` regularly
   - Review dependency changes

3. **Testing**
   - Test auth edge cases
   - Test error handling
   - Mock external services

## Security Features

### Authentication

- ✅ Dual authentication (API Key + JWT)
- ✅ Automatic token refresh
- ✅ Secure token storage
- ✅ Rate limiting protection

### Data Protection

- ✅ Sensitive data sanitization in logs
- ✅ No data retention policy
- ✅ End-to-end encryption (TLS 1.3)
- ✅ Request ID tracking for audit

### Error Handling

- ✅ No sensitive data in error messages
- ✅ Proper error classification
- ✅ Retry with exponential backoff
- ✅ Circuit breaker patterns

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Report**: Researcher reports vulnerability privately
2. **Acknowledgment**: We confirm receipt within 48h
3. **Investigation**: We assess and validate the issue
4. **Fix**: We develop and test a patch
5. **Release**: We release a security update
6. **Disclosure**: Public disclosure after fix is available

### Credit

We credit security researchers who:

- Report legitimate vulnerabilities
- Follow responsible disclosure
- Provide clear reproduction steps
- Allow reasonable time for fixes

## Security Updates

Subscribe to security updates:

- GitHub Watch (Releases only)
- Email: mailsafepro1@gmail.com
- RSS:
  [Security Feed](https://github.com/mailsafepro/zapier-integration/releases)

## Compliance

This integration follows:

- ✅ OWASP Top 10 best practices
- ✅ GDPR data protection requirements
- ✅ SOC 2 Type II standards
- ✅ ISO 27001 guidelines

## Security Checklist for PRs

Before submitting code:

- [ ] No secrets in code/comments
- [ ] Input validation added
- [ ] Error messages don't leak info
- [ ] Logs sanitized
- [ ] Dependencies reviewed
- [ ] Tests cover security cases
- [ ] Documentation updated

## Contact

- **Security Email**: mailsafepro1@gmail.com
- **GPG Key**: Available on request
- **Response Time**: 48 hours max

Thank you for helping keep MailSafePro secure! 🔒
