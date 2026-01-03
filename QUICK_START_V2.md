# 🚀 Quick Start - MailSafePro Zapier v2.0.0

## ✅ Estado Actual

- **Versión:** 2.0.0
- **Estado:** Desplegada en Zapier (modo privado)
- **App ID:** 233508
- **Fecha:** 3 de enero de 2026

---

## 🎯 Acceso Rápido

### Ver tu Integración en Zapier

```bash
open https://zapier.com/app/developer
```

### Crear un Zap de Prueba

```bash
open https://zapier.com/app/zaps
```

---

## 🆕 Nuevas Funcionalidades v2.0.0

### 1. 🔔 Batch Validation Complete (Webhook)

**Trigger que se activa automáticamente cuando un batch termina**

```
Uso en Zap:
1. Trigger: MailSafePro → Batch Validation Complete
2. Configura filtros (opcional): estado, mínimo de emails
3. Recibe: job_id, success_rate, results_summary
4. Usa en acciones siguientes: Slack, Email, Google Sheets, etc.
```

### 2. 📊 Get Batch Status

**Consulta el progreso de un batch en tiempo real**

```
Uso en Zap:
1. Action: MailSafePro → Get Batch Status
2. Input: job_id (del paso anterior)
3. Output: status, progress_percentage, time_remaining
4. Usa con Filter para esperar hasta que complete
```

### 3. 📋 Get Batch Results

**Obtiene resultados con filtrado y paginación**

```
Uso en Zap:
1. Action: MailSafePro → Get Batch Results
2. Input: job_id, filter_status (valid/invalid/risky)
3. Output: results[] con todos los emails validados
4. Exporta a CSV, JSON o Excel
```

### 4. 🛑 Cancel Batch Validation

**Cancela batches en progreso**

```
Uso en Zap:
1. Action: MailSafePro → Cancel Batch Validation
2. Input: job_id, reason (opcional)
3. Output: cancelled_at, partial_results
```

---

## 📝 Ejemplos de Workflows

### Ejemplo 1: Validación Batch Completa

```
1. Trigger: Google Sheets → New Row
2. Action: MailSafePro → Batch Validate Emails
   - emails: {{Column: Email List}}
   - Output: {{job_id}}
3. Delay: 5 minutes
4. Action: MailSafePro → Get Batch Status
   - job_id: {{Step 2: job_id}}
5. Filter: {{Step 4: status}} = "completed"
6. Action: MailSafePro → Get Batch Results
   - job_id: {{Step 2: job_id}}
   - filter_status: "valid"
7. Action: Google Sheets → Create Rows
   - Data: {{Step 6: results}}
```

### Ejemplo 2: Notificación Automática con Webhook

```
1. Trigger: MailSafePro → Batch Validation Complete
   - filter_status: "all"
2. Filter: {{success_rate}} < 70
3. Action: Slack → Send Message
   - Message: "⚠️ Batch {{job_id}} tiene solo {{success_rate}}% válidos"
4. Action: Email → Send Email
   - To: admin@company.com
   - Subject: "Alerta de Calidad"
```

### Ejemplo 3: Monitoreo con Polling

```
1. Trigger: Schedule → Every 5 minutes
2. Action: MailSafePro → Get Batch Status
   - job_id: [ID guardado en Storage]
3. Filter: {{status}} = "processing"
4. Action: Slack → Update Message
   - Message: "Progreso: {{progress_percentage}}%"
```

---

## 🔑 Autenticación

### Opción 1: API Key (Recomendado)

```
1. Ve a: https://app.mailsafepro.com/dashboard/api-keys
2. Crea una nueva API Key
3. En Zapier, conecta con: API Key
4. Pega tu key (empieza con sk_live_ o sk_test_)
```

### Opción 2: JWT (Email + Password)

```
1. En Zapier, conecta con: Email + Password
2. Ingresa tu email de MailSafePro
3. Ingresa tu contraseña
4. El token se refresca automáticamente
```

---

## 🧪 Testing

### Test Rápido de Validación Individual

```
1. Crea un Zap nuevo
2. Trigger: Webhooks by Zapier → Catch Hook
3. Action: MailSafePro → Validate Email Advanced
   - email: test@example.com
   - check_smtp: true
4. Test → Verifica que recibas:
   - valid: true/false
   - risk_score: 0.0-1.0
   - quality_score: 0.0-1.0
```

### Test de Batch

```
1. Action: MailSafePro → Batch Validate Emails
   - emails: "test1@example.com, test2@example.com"
   - priority: "normal"
2. Test → Verifica que recibas:
   - job_id: batch_xxxxx
   - status: "processing"
   - tracking_url: https://...
```

---

## 📊 Monitoreo

### Ver Logs en Tiempo Real

```bash
cd MailSafePro-Zapier
npx zapier-platform logs --type=http --detailed
```

### Ver Versiones Desplegadas

```bash
npx zapier-platform versions
```

### Ver Historial de Cambios

```bash
npx zapier-platform history
```

---

## 🐛 Troubleshooting

### Error: "Authentication failed"

```
Solución:
1. Verifica que tu API Key esté activa
2. O reconecta con email + password
3. Revisa que no haya expirado
```

### Error: "Batch not found"

```
Solución:
1. Verifica que el job_id sea correcto
2. Espera unos segundos después de crear el batch
3. Usa Get Batch Status para verificar
```

### Error: "Rate limit exceeded"

```
Solución:
1. Añade un Delay entre acciones
2. Reduce la frecuencia de polling
3. Usa webhooks en lugar de polling
```

---

## 🚀 Comandos Útiles

```bash
# Ver integración en Zapier
npx zapier-platform integrations

# Ver todas las versiones
npx zapier-platform versions

# Ver logs
npx zapier-platform logs

# Invitar usuario beta
npx zapier-platform invite user@example.com

# Validar cambios locales
npx zapier-platform validate

# Push nueva versión
npx zapier-platform push

# Ver historial
npx zapier-platform history
```

---

## 📚 Recursos

- **Dashboard:** https://zapier.com/app/developer
- **Crear Zaps:** https://zapier.com/app/zaps
- **Documentación:** https://platform.zapier.com/
- **API Reference:** https://docs.mailsafepro.com/api

---

## 💡 Tips Pro

1. **Usa Webhooks** en lugar de polling para mejor performance
2. **Filtra resultados** en Get Batch Results para reducir datos
3. **Guarda job_id** en Storage para tracking a largo plazo
4. **Usa Delays** inteligentes basados en el tamaño del batch
5. **Monitorea success_rate** para alertas de calidad

---

## ✅ Checklist de Primer Uso

- [ ] Conectar cuenta de MailSafePro en Zapier
- [ ] Crear Zap de prueba con Validate Email
- [ ] Probar Batch Validate con lista pequeña
- [ ] Configurar Webhook para notificaciones
- [ ] Crear Zap de monitoreo con Get Batch Status
- [ ] Probar Get Batch Results con filtros
- [ ] Configurar alertas de calidad

---

**¡Listo para usar! 🎉**

Tu integración v2.0.0 está desplegada y funcionando en modo privado. Empieza
creando tu primer Zap en: https://zapier.com/app/zaps
