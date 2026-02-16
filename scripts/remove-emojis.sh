#!/bin/bash

# Script para remover emojis de labels en archivos JS de la integración Zapier

FILES=(
  "triggers/validate_email.js"
  "triggers/batch_webhook.js"
  "creates/batch_validate.js"
  "creates/cancel_batch.js"
  "searches/get_usage.js"
  "searches/get_batch_status.js"
  "searches/get_batch_results.js"
)

echo "Removing emojis from labels in Zapier integration files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Remover emojis de labels (reemplazar label: '📧 Texto' con label: 'Texto')
    sed -i '' "s/label: '[📧📊✅❌⚠️🔍⭐⚡🚀📈📉📋🏷️🆔📅⏱️🎯🛡️🔐📞🔗📥📊🔗📢🏆💎🎯💡📊📅📋📢🎯🎯🔔⏳📋📊📓🐢🚶🚛⬆️⬇️📋📏📓📊📅🔫🏆🏢📭🖥️📋🔍🛡️🔐📨🚫🎓🎢🔗🏆💎💡🚨🔧🛑🔗🔄]/label: '/g" "$file"
    echo "  ✓ Emojis removed from $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "Emoji removal complete!"
echo ""
echo "Running tests..."
npm run test:unit 2>&1 | grep -E "(PASS|FAIL|Test Suites|Tests:)" | tail -20
