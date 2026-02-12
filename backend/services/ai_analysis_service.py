"""
AI Analysis Service for Siempria Monitor
Provides predictive analysis, anomaly detection, and smart alerts
"""
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Emergent LLM Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

class AIAnalysisService:
    """Service for AI-powered device monitoring analysis"""
    
    def __init__(self):
        self.api_key = EMERGENT_LLM_KEY
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY not configured")
    
    def _create_chat(self, session_id: str, system_message: str) -> LlmChat:
        """Create a new LLM chat instance"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
    
    async def analyze_device_patterns(self, device_history: List[Dict]) -> Dict[str, Any]:
        """
        Analyze device history to predict potential failures
        """
        if not self.api_key:
            return {"error": "AI service not configured", "predictions": []}
        
        try:
            # Prepare data summary for AI
            summary = self._prepare_history_summary(device_history)
            
            chat = self._create_chat(
                session_id=f"pattern-analysis-{datetime.now().strftime('%Y%m%d%H%M')}",
                system_message="""Eres un experto en análisis de infraestructura de red y monitorización de dispositivos.
Tu tarea es analizar patrones de caídas y latencia para predecir posibles fallos futuros.
Responde siempre en español y de forma concisa.
Formato de respuesta JSON:
{
    "risk_level": "bajo|medio|alto|crítico",
    "predictions": [{"device": "nombre", "risk": "alto|medio|bajo", "reason": "motivo"}],
    "recommendations": ["recomendación 1", "recomendación 2"],
    "summary": "resumen ejecutivo breve"
}"""
            )
            
            message = UserMessage(
                text=f"""Analiza estos datos de monitorización de dispositivos y predice posibles fallos:

{summary}

Identifica:
1. Dispositivos con alto riesgo de fallo
2. Patrones de latencia preocupantes
3. Dispositivos con caídas frecuentes
4. Recomendaciones de mantenimiento preventivo"""
            )
            
            response = await chat.send_message(message)
            
            # Parse JSON response
            import json
            try:
                # Try to extract JSON from response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "{" in response:
                    start = response.index("{")
                    end = response.rindex("}") + 1
                    json_str = response[start:end]
                else:
                    json_str = response
                
                result = json.loads(json_str)
                result["timestamp"] = datetime.utcnow().isoformat()
                return result
            except:
                return {
                    "risk_level": "desconocido",
                    "predictions": [],
                    "recommendations": [],
                    "summary": response,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error in AI pattern analysis: {e}")
            return {"error": str(e), "predictions": []}
    
    async def detect_anomalies(self, current_metrics: Dict, historical_avg: Dict) -> Dict[str, Any]:
        """
        Detect anomalies in current metrics compared to historical averages
        """
        if not self.api_key:
            return {"anomalies": [], "alert_level": "normal"}
        
        try:
            chat = self._create_chat(
                session_id=f"anomaly-detection-{datetime.now().strftime('%Y%m%d%H%M')}",
                system_message="""Eres un sistema de detección de anomalías para infraestructura de red.
Compara métricas actuales con promedios históricos e identifica desviaciones significativas.
Responde en español con formato JSON:
{
    "alert_level": "normal|atención|warning|crítico",
    "anomalies": [{"metric": "nombre", "current": valor, "expected": valor, "deviation": "%", "severity": "bajo|medio|alto"}],
    "immediate_action_required": true/false,
    "summary": "descripción breve"
}"""
            )
            
            message = UserMessage(
                text=f"""Métricas actuales: {current_metrics}
Promedios históricos: {historical_avg}

Detecta anomalías significativas considerando:
- Latencia > 50% sobre el promedio = anomalía
- Dispositivos offline > promedio = anomalía
- Tasa de errores inusual = anomalía"""
            )
            
            response = await chat.send_message(message)
            
            import json
            try:
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "{" in response:
                    start = response.index("{")
                    end = response.rindex("}") + 1
                    json_str = response[start:end]
                else:
                    json_str = response
                return json.loads(json_str)
            except:
                return {"anomalies": [], "alert_level": "normal", "summary": response}
                
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return {"anomalies": [], "alert_level": "error", "error": str(e)}
    
    async def generate_smart_alert(self, alerts: List[Dict], recent_alerts_count: int) -> Dict[str, Any]:
        """
        Filter and prioritize alerts to avoid alert fatigue
        """
        if not self.api_key or not alerts:
            return {"filtered_alerts": alerts[:5], "suppressed": 0, "priority_summary": ""}
        
        try:
            chat = self._create_chat(
                session_id=f"smart-alert-{datetime.now().strftime('%Y%m%d%H%M')}",
                system_message="""Eres un sistema inteligente de gestión de alertas.
Tu objetivo es filtrar alertas redundantes y priorizar las más importantes para evitar fatiga de alertas.
Responde en español con formato JSON:
{
    "priority_alerts": [{"id": "id", "device": "nombre", "priority": "crítica|alta|media|baja", "reason": "motivo"}],
    "suppressed_count": número,
    "suppression_reason": "motivo de supresión",
    "executive_summary": "resumen para el operador en 1-2 frases"
}"""
            )
            
            alerts_summary = [{"id": a.get("id", ""), "device": a.get("device_name", ""), "type": a.get("alert_type", ""), "time": a.get("timestamp", "")} for a in alerts[:20]]
            
            message = UserMessage(
                text=f"""Alertas recientes: {alerts_summary}
Total de alertas en las últimas 24h: {recent_alerts_count}

Filtra y prioriza:
1. Agrupa alertas del mismo dispositivo
2. Prioriza dispositivos críticos (CRA, servidores principales)
3. Suprime alertas de recuperación inmediata (<5 min)
4. Identifica patrones de flapping (on/off repetido)"""
            )
            
            response = await chat.send_message(message)
            
            import json
            try:
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "{" in response:
                    start = response.index("{")
                    end = response.rindex("}") + 1
                    json_str = response[start:end]
                else:
                    json_str = response
                return json.loads(json_str)
            except:
                return {"filtered_alerts": alerts[:5], "suppressed": 0, "summary": response}
                
        except Exception as e:
            logger.error(f"Error in smart alert: {e}")
            return {"filtered_alerts": alerts[:5], "suppressed": 0, "error": str(e)}
    
    async def generate_daily_summary(self, stats: Dict, alerts: List[Dict], incidents: List[Dict]) -> Dict[str, Any]:
        """
        Generate an executive daily summary with AI insights
        """
        if not self.api_key:
            return {"summary": "Servicio de IA no configurado", "highlights": [], "concerns": []}
        
        try:
            chat = self._create_chat(
                session_id=f"daily-summary-{datetime.now().strftime('%Y%m%d')}",
                system_message="""Eres el asistente ejecutivo de Siempria Monitor.
Genera resúmenes diarios claros y accionables para el equipo de operaciones.
Responde en español con formato JSON:
{
    "executive_summary": "Resumen ejecutivo en 2-3 frases",
    "health_score": 0-100,
    "highlights": ["logro 1", "logro 2"],
    "concerns": ["preocupación 1 con acción sugerida"],
    "recommendations": ["recomendación prioritaria"],
    "trend": "mejorando|estable|empeorando"
}"""
            )
            
            message = UserMessage(
                text=f"""Datos del día:
- Estadísticas: {stats}
- Número de alertas: {len(alerts)}
- Incidentes abiertos: {len(incidents)}

Genera un resumen ejecutivo que incluya:
1. Estado general del sistema (puntuación de salud 0-100)
2. Logros destacados (si hay)
3. Puntos de preocupación que requieren atención
4. Tendencia comparada con días anteriores
5. Recomendación prioritaria para mañana"""
            )
            
            response = await chat.send_message(message)
            
            import json
            try:
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "{" in response:
                    start = response.index("{")
                    end = response.rindex("}") + 1
                    json_str = response[start:end]
                else:
                    json_str = response
                result = json.loads(json_str)
                result["generated_at"] = datetime.utcnow().isoformat()
                return result
            except:
                return {
                    "executive_summary": response,
                    "health_score": 0,
                    "highlights": [],
                    "concerns": [],
                    "recommendations": [],
                    "trend": "desconocido",
                    "generated_at": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error generating daily summary: {e}")
            return {"error": str(e), "summary": "Error al generar resumen"}
    
    def _prepare_history_summary(self, device_history: List[Dict]) -> str:
        """Prepare device history data for AI analysis"""
        if not device_history:
            return "Sin datos históricos disponibles"
        
        # Group by device and count incidents
        device_stats = {}
        for record in device_history:
            device_name = record.get("device_name", "Unknown")
            if device_name not in device_stats:
                device_stats[device_name] = {
                    "downs": 0,
                    "avg_latency": [],
                    "last_down": None
                }
            
            if record.get("alert_type") == "device_down":
                device_stats[device_name]["downs"] += 1
                device_stats[device_name]["last_down"] = record.get("timestamp")
            
            if record.get("response_time_ms"):
                device_stats[device_name]["avg_latency"].append(record.get("response_time_ms"))
        
        # Format summary
        lines = ["Resumen de dispositivos (últimos 7 días):"]
        for device, stats in sorted(device_stats.items(), key=lambda x: x[1]["downs"], reverse=True)[:15]:
            avg_lat = sum(stats["avg_latency"]) / len(stats["avg_latency"]) if stats["avg_latency"] else 0
            lines.append(f"- {device}: {stats['downs']} caídas, latencia media {avg_lat:.0f}ms")
        
        return "\n".join(lines)


# Singleton instance
ai_service = AIAnalysisService()
