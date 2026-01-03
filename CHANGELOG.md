# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-03

### Added

- 🔔 **Webhook Trigger**: Recibe notificaciones automáticas cuando un batch se
  completa
- 📊 **Consultar Estado de Batch**: Monitorea el progreso de validaciones en
  tiempo real
- 📋 **Obtener Resultados de Batch**: Recupera resultados con filtrado,
  paginación y exportación
- 🛑 **Cancelar Batch**: Nueva acción para cancelar batches en progreso
- 📈 Métricas avanzadas: tasas de éxito, riesgo e invalidez calculadas
  automáticamente
- 🔗 URLs de acción directas para exportar resultados en CSV, JSON y Excel
- ⏱️ Estimaciones de tiempo restante y recomendaciones de polling
- 🎯 Filtros avanzados por estado de validación

### Changed

- ⬆️ Versión actualizada a 2.0.0
- 🔧 User-Agent unificado a `Zapier-MailSafePro/2.0.0` en todos los módulos
- 📝 Documentación mejorada con más ejemplos y campos de salida
- 🏷️ Etiquetas con emojis para mejor UX en Zapier

### Fixed

- 🐛 Inconsistencia de versiones entre package.json y código
- 🐛 User-Agent inconsistente entre módulos

### Technical

- Arquitectura modular mejorada
- Nuevos módulos: `triggers/batch_webhook.js`, `searches/get_batch_status.js`,
  `searches/get_batch_results.js`
- Tests actualizados para nuevas funcionalidades

## [1.0.0] - 2025-01-22

### Added

- 🎯 Dual authentication system (API Key + JWT with auto-refresh)
- 🔍 Advanced email validation trigger with spam trap detection
- 📊 Batch validation with real-time progress tracking
- 📈 Usage analytics search with projections and recommendations
- 🔄 Intelligent retry logic with exponential backoff
- 🚨 Comprehensive error handling with auto-recovery
- 🧪 198 unit and integration tests (99% passing)
- 📝 Structured logging with sensitive data sanitization
- 🌐 Multi-language support (English, Spanish, Portuguese)
- ⚡ Performance benchmarks and monitoring
- 🔒 Enterprise-grade security features
- 📚 Comprehensive documentation and examples

### Technical

- GitHub Actions CI/CD pipeline
- Pre-commit hooks for code quality
- TypeScript definitions for IDE support
- Request deduplication for performance
- Modular architecture with clear separation of concerns
- ESLint + Prettier for code formatting
- Jest with >92% code coverage

### Documentation

- Complete README with usage examples
- API reference and error codes
- Architecture diagrams
- Contributing guidelines
- Security policy

## [Unreleased]

### Planned

- Webhook triggers for real-time events
- Polling trigger for batch result monitoring
- Circuit breaker pattern for resilience
- Additional locale support (French, German)
- GraphQL API support

---

[1.0.0]: https://github.com/mailsafepro/zapier-integration/releases/tag/v1.0.0
