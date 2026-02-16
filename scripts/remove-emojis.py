#!/usr/bin/env python3
"""
Script para remover emojis de labels en archivos JS de la integración Zapier.
Este script solo remplace emojis en labels de outputFields sin afectar la estructura del código.
"""

import re
import os
import sys

FILES_TO_UPDATE = [
    "triggers/validate_email.js",
    "triggers/batch_webhook.js",
    "triggers/new_validation_completed.js",
    "triggers/new_high_risk_email.js",
    "creates/batch_validate.js",
    "creates/cancel_batch.js",
    "creates/add_to_suppression_list.js",
    "creates/remove_from_suppression_list.js",
    "searches/get_usage.js",
    "searches/get_batch_status.js",
    "searches/get_batch_results.js",
    "searches/find_email.js",
]

# Mapeo de emojis a texto sin emoji (solo para labels, no para valores de choices o helpText)
EMOJI_REPLACEMENTS = {
    r"📧 Email validado": "Validated Email",
    r"📊 Estado de entrega": "Deliverability Status",
    r"📝 Detalle del resultado": "Result Detail",
    r"⚠️ Puntuación de riesgo \(0-1\)": "Risk Score (0-1)",
    r"⭐ Puntuación de calidad \(0-1\)": "Quality Score (0-1)",
    r"⏱️ Tiempo de procesamiento \(segundos\)": "Processing Time (seconds)",
    r"🚚 Nivel de entregabilidad": "Deliverability Level",
    r"🔴 Nivel de riesgo": "Risk Level",
    r"🏆 Nivel de calidad": "Quality Level",
    r"🚨 Alto riesgo": "High Risk",
    r"🏅 Proveedor premium": "Premium Provider",
    r"🛡️ Tiene registros seguridad": "Has Security Records",
    r"🏢 Proveedor de email": "Email Provider",
    r"📊 Reputación del proveedor": "Provider Reputation",
    r"🔍 Huella del proveedor": "Provider Fingerprint",
    r"🔍 SMTP verificado": "SMTP Verified",
    r"📭 Buzón existe": "Mailbox Exists",
    r"🖥️ Servidor MX": "MX Server",
    r"📋 Detalle SMTP": "SMTP Detail",
    r"🛡️ Estado SPF": "SPF Status",
    r"🔐 Estado DKIM": "DKIM Status",
    r"📨 Estado DMARC": "DMARC Status",
    r"🔎 Spam trap verificado": "Spam Trap Checked",
    r"🚫 Es spam trap": "Is Spam Trap",
    r"🎯 Confianza detección spam": "Spam Detection Confidence",
    r"🎣 Tipo de spam trap": "Spam Trap Type",
    r"🆔 ID de validación": "Validation ID",
    r"💾 Cache usado": "Cache Used",
    r"💎 Plan del cliente": "Client Plan",
    r"📅 Fecha de validación": "Validation Date",
    r"🆔 ID del Batch": "Batch ID",
    r"📊 Estado \(Display\)": "Status Display",
    r"🏷️ Nombre del Batch": "Batch Name",
    r"📧 Total de Emails": "Total Emails",
    r"✅ Emails Procesados": "Processed Emails",
    r"📈 Progreso \(%\)": "Progress Percentage",
    r"🏁 Completado": "Is Complete",
    r"⏳ En Proceso": "Is Processing",
    r"📋 En Cola": "Is Queued",
    r"🚀 Inicio": "Started At",
    r"⏱️ Finalización Estimada": "Estimated Completion",
    r"⏰ Tiempo Restante \(seg\)": "Time Remaining (seconds)",
    r"⏰ Tiempo Restante": "Time Remaining",
    r"🔍 Fecha de Consulta": "Queried At",
    r"✅ Válidos \(Parcial\)": "Valid (Partial)",
    r"❌ Inválidos \(Parcial\)": "Invalid (Partial)",
    r"⚠️ Riesgosos \(Parcial\)": "Risky (Partial)",
    r"📊 Posición en Cola": "Queue Position",
    r"🎯 Prioridad": "Priority",
    r"🔗 URL de Resultados": "Results URL",
    r"🛑 URL para Cancelar": "Cancel Batch URL",
    r"⏱️ Próximo Poll \(seg\)": "Recommended Next Poll (seconds)",
    r"📊 Estado Final": "Final Status",
    r"🛑 Fecha de Cancelación": "Cancelled At",
    r"📝 Motivo": "Cancellation Reason",
    r"💾 Resultados Preservados": "Partial Results Preserved",
    r"📊 Estado \(Display\)": "Status Display",
    r"📧 Total Original": "Original Total",
    r"✅ Procesados Antes de Cancelar": "Processed Before Cancel",
    r"🔗 Ver Resultados Parciales": "View Partial Results",
    r"🔗 Crear Nuevo Batch": "Create New Batch",
    r"📥 Método de Entrada": "Input Method",
    r"📥 Método de Entrada Utilizado": "Input Method Used",
    r"📧 Total de Emails Estimado": "Total Estimated Emails",
    r"🔄 Verificación SMTP Solicitada": "SMTP Verification Requested",
    r"🔍 DNS Raw Incluido": "Raw DNS Included",
    r"🎯 Prioridad de Procesamiento": "Processing Priority",
    r"📍 URL de Seguimiento": "Tracking URL",
    r"📋 URL de Resultados": "Results URL",
    r"📞 URL de Callback": "Callback URL",
    r"🔄 Permite Consulta de Estado": "Can Poll Status",
    r"⏰ Intervalo Recomendado para Polling \(segundos\)": "Recommended Poll Interval (seconds)",
    r"📄 Página Actual": "Current Page",
    r"📊 Tamaño de Página": "Page Size",
    r"📈 Total de Resultados": "Total Results",
    r"📑 Total de Páginas": "Total Pages",
    r"➡️ Tiene Siguiente Página": "Has Next Page",
    r"⬅️ Tiene Página Anterior": "Has Previous Page",
    r"📊 Total Procesados": "Total Processed",
    r"✅ Válidos": "Valid",
    r"❌ Inválidos": "Invalid",
    r"⚠️ Riesgosos": "Risky",
    r"❓ Desconocidos": "Unknown",
    r"📧 Email": "Email",
    r"📊 Estado": "Status",
    r"✅ Válido": "Valid",
    r"📈 Nivel de riesgo": "Risk Level",
    r"🏆 Nivel de calidad": "Quality Level",
    r"✉️ Seguro para Enviar": "Safe to Send",
    r"🏢 Proveedor": "Provider",
    r"📊 Resultados en Esta Página": "Results on This Page",
    r"📥 Descargar CSV": "Download CSV",
    r"📥 Descargar JSON": "Download JSON",
    r"📥 Exportar Excel": "Export Excel",
    r"➡️ URL Siguiente Página": "Next Page URL",
    r"⬅️ URL Página Anterior": "Previous Page URL",
    r"💎 Plan Actual": "Current Plan",
    r"📊 Uso Hoy": "Usage Today",
    r"📈 Límite Diario": "Daily Limit",
    r"📉 Restante Hoy": "Remaining Today",
    r"📐 Porcentaje de Uso Hoy": "Usage Percentage Today",
    r"🗓️ Uso Mensual": "Monthly Usage",
    r"📅 Límite Mensual": "Monthly Limit",
    r"📋 Restante Mensual": "Monthly Remaining",
    r"📏 Porcentaje de Uso Mensual": "Monthly Usage Percentage",
    r"🔍 Fecha de Consulta": "Queried At",
    r"📅 Rango de Tiempo Consultado": "Time Range Queried",
    r"📊 Uso Diario Promedio": "Average Daily Usage",
    r"📈 Día de Mayor Uso": "Peak Usage Day",
    r"🔥 Valor de Pico de Uso": "Peak Usage Value",
    r"📉 Tendencia de Uso": "Usage Trend",
    r"🔮 Uso Mensual Pronosticado": "Forecasted Monthly Usage",
    r"⭐ Puntuación de Eficiencia": "Efficiency Score",
    r"💰 Costo por Validación": "Cost Per Validation",
    r"📅 Días Hasta Límite": "Days Until Limit",
    r"🎯 Uso Proyectado Fin de Mes": "Projected End of Month Usage",
    r"🚨 Excederá Límite": "Will Exceed Limit",
    r"⚠️ Porcentaje de Riesgo de Exceso": "Excess Risk Percentage",
    r"🎯 Límite Diario Recomendado": "Recommended Daily Cap",
    r"🚀 URL de Actualización de Plan": "Upgrade Plan URL",
    r"📊 URL del Dashboard de Uso": "Usage Dashboard URL",
    r"📚 URL de Documentación API": "API Documentation URL",
    r"💡 Tipo de Recomendación": "Recommendation Type",
    r"🎯 Prioridad": "Priority",
    r"📝 Título": "Title",
    r"📋 Descripción": "Description",
    r"📈 Impacto": "Impact",
    r"⚡ Esfuerzo": "Effort",
    r"🎯 Acción": "Action",
    r"🚨 Tipo de Alerta": "Alert Type",
    r"📢 Mensaje de Alerta": "Alert Message",
    r"⚠️ Severidad": "Severity",
    r"🔧 Acción Requerida": "Action Required",
    r"📊 Estado Final": "Final Status",
    r"🛑 Fecha de Cancelación": "Cancelled At",
    r"📝 Motivo": "Cancellation Reason",
    r"🔗 Ver Resultados Parciales": "View Partial Results",
    r"🔗 Crear Nuevo Batch": "Create New Batch",
    r"🔔 Batch Validation Complete \(Webhook\)": "Batch Validation Complete (Webhook)",
    r"📋 Get Batch Results": "Get Batch Results",
    r"📊 Get Advanced Usage Metrics": "Get Advanced Usage Metrics",
    r"🛑 Cancel Batch Validation": "Cancel Batch Validation",
    r"🔍 Validate Email Advanced": "Validate Email Advanced",
    r"🔗 URL de Resultados": "Results URL",
    r"🔗 URL Siguiente Página": "Next Page URL",
    r"🔗 URL Página Anterior": "Previous Page URL",
    r"📥 Descargar CSV": "Download CSV",
    r"📥 Descargar JSON": "Download JSON",
    r"📥 Exportar CSV": "Export CSV",
    r"📥 Exportar JSON": "Export JSON",
    r"📥 Exportar Excel": "Export Excel",
    r"➡️ URL Siguiente Página": "Next Page URL",
    r"⬅️ URL Página Anterior": "Previous Page URL",
    r"📊 Estado Final": "Final Status",
    r"📊 Estado \(Display\)": "Status Display",
    r"💎 Plan Actual": "Current Plan",
    r"📊 Uso Hoy": "Usage Today",
    r"📈 Límite Diario": "Daily Limit",
    r"📉 Restante Hoy": "Remaining Today",
    r"📐 Porcentaje de Uso Hoy": "Usage Percentage Today",
    r"🗓️ Uso Mensual": "Monthly Usage",
    r"📅 Límite Mensual": "Monthly Limit",
    r"📋 Restante Mensual": "Monthly Remaining",
    r"📏 Porcentaje de Uso Mensual": "Monthly Usage Percentage",
    r"🔍 Fecha de Consulta": "Queried At",
    r"📅 Rango de Tiempo Consultado": "Time Range Queried",
    r"📊 Uso Diario Promedio": "Average Daily Usage",
    r"📈 Día de Mayor Uso": "Peak Usage Day",
    r"🔥 Valor de Pico de Uso": "Peak Usage Value",
    r"📉 Tendencia de Uso": "Usage Trend",
    r"🔮 Uso Mensual Pronosticado": "Forecasted Monthly Usage",
    r"⭐ Puntuación de Eficiencia": "Efficiency Score",
    r"💰 Costo por Validación": "Cost Per Validation",
    r"📅 Días Hasta Límite": "Days Until Limit",
    r"🎯 Uso Proyectado Fin de Mes": "Projected End of Month Usage",
    r"🚨 Excederá Límite": "Will Exceed Limit",
    r"⚠️ Porcentaje de Riesgo de Exceso": "Excess Risk Percentage",
    r"🎯 Límite Diario Recomendado": "Recommended Daily Cap",
    r"🚀 URL de Actualización de Plan": "Upgrade Plan URL",
    r"📊 URL del Dashboard de Uso": "Usage Dashboard URL",
    r"📚 URL de Documentación API": "API Documentation URL",
    r"💡 Tipo de Recomendación": "Recommendation Type",
    r"🎯 Prioridad": "Priority",
    r"📝 Título": "Title",
    r"📋 Descripción": "Description",
    r"📈 Impacto": "Impact",
    r"⚡ Esfuerzo": "Effort",
    r"🎯 Acción": "Action",
    r"🚨 Tipo de Alerta": "Alert Type",
    r"📢 Mensaje de Alerta": "Alert Message",
    r"⚠️ Severidad": "Severity",
    r"🔧 Acción Requerida": "Action Required",
    r"🆔 ID del Batch": "Batch ID",
    r"📊 Estado Final": "Final Status",
    r"📊 Estado \(Display\)": "Status Display",
    r"🏷️ Nombre del Batch": "Batch Name",
    r"📧 Total de Emails": "Total Emails",
    r"⏱️ Tiempo de Procesamiento \(seg\)": "Processing Time (seconds)",
    r"🚀 Inicio del Procesamiento": "Processing Started",
    r"✅ Fin del Procesamiento": "Processing Completed",
    r"📊 Total Procesados": "Total Processed",
    r"✅ Emails Válidos": "Valid Emails",
    r"❌ Emails Inválidos": "Invalid Emails",
    r"⚠️ Emails Riesgosos": "Risky Emails",
    r"❓ Emails Desconocidos": "Unknown Emails",
    r"📈 Tasa de Éxito \(%\)": "Success Rate (%)",
    r"⚠️ Tasa de Riesgo \(%\)": "Risk Rate (%)",
    r"❌ Tasa de Inválidos \(%\)": "Invalid Rate (%)",
    r"📅 Fecha de Recepción": "Received At",
    r"🔗 URL de Resultados": "Results URL",
    r"📥 Descargar CSV": "Download CSV",
    r"📥 Descargar JSON": "Download JSON",
    r"✅ Batch Completado": "Batch Completed",
    r"📊 Filtrar por Estado": "Filter by Status",
    r"📧 Mínimo de Emails": "Minimum Emails",
    r"📊 Incluir Resumen de Resultados": "Include Results Summary",
    r"✅ Validados \(Parcial\)": "Valid (Partial)",
    r"❌ Inválidos \(Parcial\)": "Invalid (Partial)",
    r"⚠️ Riesgosos \(Parcial\)": "Risky (Partial)",
    r"🆔 ID del Batch": "Batch ID",
    r"📊 Estado": "Status",
    r"🏷️ Nombre del Batch": "Batch Name",
    r"📧 Total de Emails": "Total Emails",
    r"⏱️ Tiempo de Procesamiento \(seg\)": "Processing Time (seconds)",
    r"🚀 Inicio del Procesamiento": "Processing Started",
    r"✅ Fin del Procesamiento": "Processing Completed",
    r"📊 Total Procesados": "Total Processed",
    r"✅ Emails Válidos": "Valid Emails",
    r"❌ Emails Inválidos": "Invalid Emails",
    r"⚠️ Emails Riesgosos": "Risky Emails",
    r"❓ Emails Desconocidos": "Unknown Emails",
    r"📈 Tasa de Éxito \(%\)": "Success Rate (%)",
    r"⚠️ Tasa de Riesgo \(%\)": "Risk Rate (%)",
    r"❌ Tasa de Inválidos \(%\)": "Invalid Rate (%)",
    r"📅 Fecha de Recepción": "Received At",
    r"🔗 URL de Resultados": "Results URL",
    r"📥 Descargar CSV": "Download CSV",
    r"📥 Descargar JSON": "Download JSON",
    r"🔎 Find Email by Address": "Find Email by Address",
    r"🔍 Include Partial Results": "Include Partial Results",
    r"🔄 Sort Order": "Sort Order",
    r"📈 Sort By": "Sort By",
    r"🔍 Include Full Details": "Include Full Details",
    r"🔮 Include Projections": "Include Projections",
    r"💡 Include Recommendations": "Include Recommendations",
    r"📅 Time Range": "Time Range",
    r"📅 Start Date": "Start Date",
    r"📅 End Date": "End Date",
    r"🆔 ID del Batch": "Batch ID",
    r"📊 Estado": "Status",
    r"📊 Estado \(Display\)": "Status Display",
    r"🏷️ Nombre del Batch": "Batch Name",
    r"📧 Total de Emails": "Total Emails",
    r"⏱️ Tiempo de Procesamiento \(seg\)": "Processing Time (seconds)",
    r"🚀 Inicio del Procesamiento": "Processing Started",
    r"✅ Fin del Procesamiento": "Processing Completed",
    r"📊 Total Procesados": "Total Processed",
    r"✅ Emails Válidos": "Valid Emails",
    r"❌ Emails Inválidos": "Invalid Emails",
    r"⚠️ Emails Riesgosos": "Risky Emails",
    r"❓ Emails Desconocidos": "Unknown Emails",
    r"📈 Tasa de Éxito \(%\)": "Success Rate (%)",
    r"⚠️ Tasa de Riesgo \(%\)": "Risk Rate (%)",
    r"❌ Tasa de Inválidos \(%\)": "Invalid Rate (%)",
    r"📅 Fecha de Recepción": "Received At",
    r"🔗 URL de Resultados": "Results URL",
    r"📥 Descargar CSV": "Download CSV",
    r"📥 Descargar JSON": "Download JSON",
    r"🔎 Find Email by Address": "Find Email by Address",
    r"🔍 Include Partial Results": "Include Partial Results",
    r"🔄 Sort Order": "Sort Order",
    r"📈 Sort By": "Sort By",
    r"🔍 Include Full Details": "Include Full Details",
    r"🔮 Include Projections": "Include Projections",
    r"💡 Include Recommendations": "Include Recommendations",
    r"📅 Time Range": "Time Range",
    r"📅 Start Date": "Start Date",
    r"📅 End Date": "End Date",
}

def remove_emojis_from_file(filepath):
    """Remueve emojis de las etiquetas de outputFields en un archivo JS."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Solo procesar líneas que son labels de outputFields
        lines = content.split('\n')
        modified_lines = []
        
        for line in lines:
            modified_line = line
            # Detectar patrones de label: '📧 Texto con emoji'
            if 'label:' in line and ':' in line and "'" in line:
                for emoji_pattern, replacement in EMOJI_REPLACEMENTS.items():
                    modified_line = re.sub(
                        f"label: '{emoji_pattern}'",
                        f"label: '{replacement}'",
                        modified_line
                    )
            
            modified_lines.append(modified_line)
        
        new_content = '\n'.join(modified_lines)
        
        # Solo escribir si hubo cambios
        if new_content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
    except Exception as e:
        print(f"Error procesando {filepath}: {e}", file=sys.stderr)
        return False

def main():
    print("🚀 Removiendo emojis de labels en archivos JS...")
    print()
    
    modified_count = 0
    error_count = 0
    
    for filepath in FILES_TO_UPDATE:
        if os.path.exists(filepath):
            print(f"📝 Procesando: {filepath}")
            if remove_emojis_from_file(filepath):
                modified_count += 1
                print(f"   ✓ Emojis removidos")
            else:
                print(f"   - No se encontraron cambios")
        else:
            print(f"   ✗ Archivo no encontrado: {filepath}")
            error_count += 1
        print()
    
    print(f"✨ Completado!")
    print(f"   - {modified_count} archivos modificados")
    print(f"   - {error_count} archivos con errores")
    
    return 0 if error_count == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
