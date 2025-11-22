# Contributing to MailSafePro Zapier Integration

First off, thank you for considering contributing to MailSafePro! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to
uphold this code. Please report unacceptable behavior to mailsafepro1@gmail.com.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Zapier CLI: `npm install -g zapier-platform-cli`

### Setup

1. Fork the repository
2. Clone your fork:
   `git clone https://github.com/YOUR_USERNAME/zapier-integration.git`
3. Install dependencies: `npm install`
4. Run tests: `npm test`

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linter: `npm run lint:fix`
4. Run tests: `npm test`
5. Commit your changes: `git commit -m "feat: description"`

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**

```
feat(auth): add JWT auto-refresh
fix(validation): handle edge case in email parsing
docs(readme): update installation instructions
test(batch): add integration test for large batches
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

- Place unit tests in `test/unit/`
- Place integration tests in `test/integration/`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for >90% coverage

**Example:**

```javascript
describe('Email Validation', () => {
  it('should validate valid email addresses', async () => {
    // Arrange
    const email = 'test@example.com';
    const bundle = createMockBundle({ inputData: { email } });

    // Act
    const result = await validateEmailTrigger.perform(z, bundle);

    // Assert
    expect(result[0].valid).toBe(true);
  });
});
```

## Submitting Changes

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Run lint check: `npm run lint`
5. Update CHANGELOG.md
6. Push to your fork
7. Create a Pull Request

### PR Title Format

Use the same convention as commit messages:

```
feat(scope): description
fix(scope): description
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests passing

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added
- [ ] CHANGELOG updated
```

## Coding Standards

### JavaScript Style

We use ESLint + Prettier for code formatting:

```bash
# Check formatting
npm run lint

# Auto-fix issues
npm run lint:fix

# Format all files
npm run format
```

### Best Practices

1. **DRY (Don't Repeat Yourself)**

   - Extract reusable functions
   - Use shared utilities

2. **Error Handling**

   - Always handle errors properly
   - Use appropriate error types
   - Provide helpful error messages

3. **Documentation**

   - Add JSDoc comments to functions
   - Keep README up to date
   - Include code examples

4. **Security**

   - Never commit secrets
   - Sanitize sensitive data in logs
   - Validate all inputs

5. **Performance**
   - Minimize API calls
   - Use caching when appropriate
   - Implement proper retry logic

### Code Structure

```javascript
/**
 * Brief description of function
 * @param {Object} z - Zapier object
 * @param {Object} bundle - Bundle with input data
 * @returns {Promise<Array>} - Validation results
 */
const perform = async (z, bundle) => {
  // Validate inputs
  // Main logic
  // Return formatted results
};
```

## Questions?

- 📧 Email: mailsafepro1@gmail.com
- 💬 GitHub Issues:
  [Create an issue](https://github.com/mailsafepro/zapier-integration/issues)
- 📚 Documentation: [docs.mailsafepro.com](https://docs.mailsafepro.com)

Thank you for contributing! 🚀
