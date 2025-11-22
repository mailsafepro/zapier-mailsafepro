# Architecture - MailSafePro Zapier Integration

## System Overview

The MailSafePro Zapier integration is built with a modular, enterprise-grade
architecture designed for reliability, performance, and maintainability.

```mermaid
graph TD
    A[Zapier Platform] -->|HTTP Request| B[beforeRequest Hook]
    B -->|Auth Headers| C{Authentication Type}
    C -->|API Key| D[API Key Validation]
    C -->|JWT| E[JWT Validation]
    E -->|Expired?| F[Auto Refresh]
    F -->|New Token| E

    B --> G[Request Deduplication]
    G -->|Cache Hit| H[Return Cached]
    G -->|Cache Miss| I[Continue]

    I --> J[MailSafePro API]
    J --> K[afterResponse Hook]

    K -->|429| L[Rate Limit Handler]
    L -->|Exponential Backoff| J

    K -->|401| M[Auth Error Handler]
    M -->|Refresh JWT| F

    K -->|5xx| N[Retry Logic]
    N -->|Retry| J
    N -->|Max Retries| O[Error]

    K -->|2xx| P[Success Response]

    style A fill:#e1f5ff
    style J fill:#ffe1e1
    style P fill:#e1ffe1
    style O fill:#ffe1e1
```

## Module Structure

```mermaid
graph LR
    A[index.js] -->|imports| B[auth entication.js]
    A -->|imports| C[triggers/]
    A -->|imports| D[creates/]
    A -->|imports| E[searches/]
    A -->|imports| F[lib/]

    F --> F1[i18n.js]
    F --> F2[constants.js]

    C --> C1[validate_email.js]
    D --> D1[batch_validate.js]
    E --> E1[get_usage.js]

    B -->|uses| F2
    C1 -->|uses| F1
    D1 -->|uses| F1
    E1 -->|uses| F1

    style A fill:#4CAF50
    style B fill:#2196F3
    style F fill:#FF9800
```

## Request Flow

### Single Email Validation Flow

```mermaid
sequenceDiagram
    participant Z as Zapier
    participant B as beforeRequest
    participant A as Authentication
    participant API as MailSafePro API
    participant R as afterResponse

    Z->>B: Trigger: Validate Email
    B->>B: Generate Request ID
    B->>B: Check Cache
    B->>A: Get Auth Headers
    alt API Key
        A-->>B: API Key Header
    else JWT
        A->>A: Check Token Expiry
        alt Token Valid
            A-->>B: JWT Header
        else Token Expired
            A->>API: Refresh Token
            API-->>A: New JWT
            A-->>B: New JWT Header
        end
    end
    B->>API: POST /validate/email
    API-->>R: 200 Response
    R->>R: Log Response
    R->>R: Sanitize Data
    R-->>Z: Validation Result
```

### Error Handling Flow

```mermaid
sequenceDiagram
    participant API as MailSafePro API
    participant R as afterResponse
    participant Z as Zapier

    API-->>R: Error Response
    alt 429 Rate Limit
        R->>R: Calculate Delay
        R-->>Z: ThrottledError
        Note over Z: Zapier Auto-Retry
    else 401 Unauthorized
        R->>R: Attempt JWT Refresh
        alt Refresh Success
            R->>API: Retry with New Token
        else Refresh Failed
            R-->>Z: RefreshAuthError
        end
    else 5xx Server Error
        R->>R: Check Retry Count
        alt Retries Available
            R->>R: Exponential Backoff
            R->>API: Retry Request
        else Max Retries
            R-->>Z: Error
        end
    else 4xx Client Error
        R-->>Z: Error
    else 2xx Success
        R-->>Z: Success Response
    end
```

## Component Architecture

### Authentication Module

```
authentication.js
├── getSessionKey()       → Handles initial auth
├── refreshAccessToken()  → JWT token refresh
├── preRequest()          → Injects auth headers
├── withRetry()           → Retry logic
└── exponentialBackoff()  → Delay calculation
```

**Key Features:**

- Dual auth support (API Key + JWT)
- Automatic JWT refresh (5 min before expiry)
- Exponential backoff with jitter
- Request deduplication

### Hooks System

```
index.js
├── beforeRequest()
│   ├── Request ID generation
│   ├── Cache deduplication
│   ├── Auth header injection
│   └── Standard headers
│
└── afterResponse()
    ├── Rate limit handling (429)
    ├── Auth error handling (401)
    ├── Retry logic (5xx)
    └── Error transformation
```

### i18n System

```
lib/i18n.js
├── getCurrentLocale()    → Detect user locale
├── t(key, params)        → Translate key
├── interpolate()         → Replace {{params}}
└── getNestedValue()      → Deep object access

locales/
├── en.json              → English translations
├── es.json              → Spanish translations
└── pt.json              → Portuguese translations
```

## Data Flow

### Request Pipeline

```
User Input
    ↓
Input Validation
    ↓
beforeRequest Hook
    ├→ Request Deduplication
    ├→ Authentication Headers
    └→ Logging & Tracking
    ↓
API Request
    ↓
afterResponse Hook
    ├→ Error Classification
    ├→ Retry Logic
    ├→ Data Sanitization
    └→ Response Transformation
    ↓
Zapier Output
```

### Error Recovery Strategy

```
Error Detected
    ↓
├─ 4xx Client Error?
│   ├→ Yes → Return Error
│   └→ No → Continue
│
├─ 429 Rate Limit?
│   ├→ Yes → ThrottledError + Auto-Retry
│   └→ No → Continue
│
├─ 401 Unauthorized?
│   ├→ JWT Auth?
│   │   ├→ Yes → Attempt Refresh
│   │   │   ├→ Success → Retry Request
│   │   │   └→ Fail → RefreshAuthError
│   │   └→ No → RefreshAuthError
│   └→ No → Continue
│
└─ 5xx Server Error or Timeout?
    ├→ Retry Attempts < Max?
    │   ├→ Yes → Exponential Backoff + Retry
    │   └→ No → Return Error
    └→ Success → Return Response
```

## Performance Optimizations

### 1. Request Deduplication

- Cache window: 5 seconds
- Cache key: `method:url:body`
- Max cache size: 100 entries
- Auto-cleanup on size limit

### 2. Exponential Backoff

- Base delay: 1000ms
- Max delay: 10000ms
- Jitter: ±20% randomization
- Prevents thundering herd

### 3. JWT Token Management

- Auto-refresh 5 min before expiry
- Prevents mid-request auth failures
- Reduces API calls

## Security Architecture

### Data Protection

```
User Input
    ↓
Input Sanitization
    ↓
Encrypted Transport (TLS 1.3)
    ↓
API Processing
    ↓
Response Sanitization
    ├→ Sensitive Keys Redacted
    ├→ Long Strings Truncated
    └→ Nested Objects Sanitized
    ↓
Zapier Output
```

### Sensitive Data Handling

**Sanitized Keys:**

- password
- api_key
- token
- authorization
- refresh_token
- secret

**Logging Policy:**

- All sensitive data → `[REDACTED]`
- Request/Response bodies sanitized
- Headers excluded (except in debug)
- Max body length: 500 chars

## Testing Architecture

### Test Layers

```
Unit Tests (test/unit/)
├── authentication.test.js   → 28 tests
├── index.test.js            → 64 tests
├── validate_email.test.js   → 47 tests
├── batch_validate.test.js   → 39 tests
└── get_usage.test.js        → 30 tests

Integration Tests (test/integration/)
└── end_to_end.test.js       → 10 tests

Performance Tests (test/performance/)
└── benchmark.test.js        → Latency tests
```

### Test Coverage Goals

- **Statements**: > 92%
- **Branches**: > 80%
- **Functions**: > 98%
- **Lines**: > 92%

## Deployment Architecture

### CI/CD Pipeline

```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C{Branch?}
    C -->|main/develop| D[Run Tests]
    C -->|PR| D
    D --> E[Lint Check]
    E --> F[Coverage Report]
    F --> G{All Pass?}
    G -->|Yes| H[Deploy/Merge]
    G -->|No| I[Block]

    J[Git Tag v*] --> K[Publish Workflow]
    K --> L[NPM Publish]
    K --> M[GitHub Release]

    style H fill:#4CAF50
    style I fill:#F44336
```

## Scalability Considerations

### Horizontal Scaling

- Stateless design
- No server-side sessions
- Cache can be distributed

### Rate Limiting

- Client-side throttling
- Exponential backoff
- Request deduplication

### Monitoring

- Structured logging
- Request ID tracking
- Performance benchmarks

## Future Enhancements

1. **Circuit Breaker Pattern**

   - Prevent cascading failures
   - Fast-fail on persistent errors

2. **Webhook Triggers**

   - Real-time event notifications
   - Batch completion callbacks

3. **Advanced Caching**

   - Redis integration
   - TTL-based invalidation

4. **Metrics Dashboard**
   - Real-time performance metrics
   - Error rate tracking
   - Usage analytics

---

**Last Updated**: 2025-01-22  
**Version**: 1.0.0  
**Maintainer**: MailSafePro Team
