"""
SLA Report PDF Generator Service
Generates professional PDF reports for SLA compliance
"""
import os
import io
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart

logger = logging.getLogger(__name__)

class SLAReportGenerator:
    """Generate professional SLA PDF reports"""
    
    # Siempria brand colors
    BRAND_PRIMARY = colors.HexColor("#0ea5e9")  # Cyan
    BRAND_SECONDARY = colors.HexColor("#1e293b")  # Slate dark
    BRAND_SUCCESS = colors.HexColor("#10b981")  # Emerald
    BRAND_DANGER = colors.HexColor("#ef4444")  # Red
    BRAND_WARNING = colors.HexColor("#f59e0b")  # Amber
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='Title_Custom',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=self.BRAND_SECONDARY,
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='Heading1_Custom',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=self.BRAND_PRIMARY,
            spaceBefore=20,
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='Heading2_Custom',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=self.BRAND_SECONDARY,
            spaceBefore=15,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='Body_Custom',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor("#374151"),
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer_Custom',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor("#6b7280"),
            alignment=TA_CENTER
        ))
    
    def generate_sla_report(
        self,
        organization_name: str,
        period_start: datetime,
        period_end: datetime,
        stats: Dict[str, Any],
        devices: List[Dict],
        alerts: List[Dict],
        downtime_history: List[Dict],
        sla_target: float = 99.9
    ) -> bytes:
        """
        Generate a complete SLA report PDF
        
        Returns: PDF bytes
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=25*mm,
            bottomMargin=25*mm
        )
        
        story = []
        
        # Header with logo placeholder
        story.append(self._create_header(organization_name, period_start, period_end))
        story.append(Spacer(1, 20))
        
        # Executive Summary
        story.append(self._create_executive_summary(stats, sla_target))
        story.append(Spacer(1, 15))
        
        # SLA Compliance Section
        story.append(self._create_sla_section(stats, sla_target))
        story.append(Spacer(1, 15))
        
        # Device Statistics Table
        story.append(self._create_device_stats_table(devices, stats))
        story.append(Spacer(1, 15))
        
        # Downtime History
        if downtime_history:
            story.append(self._create_downtime_section(downtime_history))
            story.append(Spacer(1, 15))
        
        # Alerts Summary
        if alerts:
            story.append(self._create_alerts_section(alerts))
            story.append(Spacer(1, 15))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(self._create_footer())
        
        doc.build(story)
        
        buffer.seek(0)
        return buffer.getvalue()
    
    def _create_header(self, org_name: str, start: datetime, end: datetime) -> Table:
        """Create report header"""
        # Logo and title
        title_text = f"""
        <font size="20" color="#0ea5e9"><b>SIEMPRIA</b></font><br/>
        <font size="14" color="#1e293b">Informe de Disponibilidad SLA</font><br/>
        <font size="10" color="#6b7280">{org_name}</font>
        """
        
        period_text = f"""
        <font size="10" color="#1e293b"><b>Período del informe:</b></font><br/>
        <font size="10" color="#6b7280">{start.strftime('%d/%m/%Y')} - {end.strftime('%d/%m/%Y')}</font><br/>
        <font size="9" color="#9ca3af">Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}</font>
        """
        
        data = [[
            Paragraph(title_text, self.styles['Normal']),
            Paragraph(period_text, ParagraphStyle('Right', alignment=TA_RIGHT, parent=self.styles['Normal']))
        ]]
        
        table = Table(data, colWidths=[300, 200])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('LINEBELOW', (0, 0), (-1, -1), 2, self.BRAND_PRIMARY),
        ]))
        
        return table
    
    def _create_executive_summary(self, stats: Dict, sla_target: float) -> list:
        """Create executive summary section"""
        elements = []
        
        elements.append(Paragraph("Resumen Ejecutivo", self.styles['Heading1_Custom']))
        
        uptime = stats.get('uptime_percent', 0)
        sla_met = uptime >= sla_target
        
        status_color = "#10b981" if sla_met else "#ef4444"
        status_text = "CUMPLIDO" if sla_met else "NO CUMPLIDO"
        
        summary_html = f"""
        <font size="11" color="#374151">
        Durante el período analizado, el sistema ha mantenido una disponibilidad del 
        <font color="{status_color}"><b>{uptime:.2f}%</b></font>, 
        {"superando" if sla_met else "por debajo del"} objetivo SLA del {sla_target}%.
        </font>
        <br/><br/>
        <font size="10" color="#6b7280">
        • Total de dispositivos monitorizados: <b>{stats.get('total', 0)}</b><br/>
        • Dispositivos online: <b>{stats.get('online', 0)}</b><br/>
        • Dispositivos offline: <b>{stats.get('offline', 0)}</b><br/>
        • Alertas en el período: <b>{stats.get('total_alerts', 0)}</b><br/>
        • Latencia media: <b>{stats.get('avg_latency', 0):.0f} ms</b>
        </font>
        """
        
        elements.append(Paragraph(summary_html, self.styles['Body_Custom']))
        
        # SLA Status Box
        status_data = [[
            Paragraph(f"<font size='14' color='white'><b>Estado SLA: {status_text}</b></font>", 
                     ParagraphStyle('Center', alignment=TA_CENTER, parent=self.styles['Normal']))
        ]]
        
        status_table = Table(status_data, colWidths=[500])
        bg_color = self.BRAND_SUCCESS if sla_met else self.BRAND_DANGER
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('ROUNDEDCORNERS', [5, 5, 5, 5]),
        ]))
        
        elements.append(Spacer(1, 10))
        elements.append(status_table)
        
        return elements
    
    def _create_sla_section(self, stats: Dict, sla_target: float) -> list:
        """Create SLA metrics section"""
        elements = []
        
        elements.append(Paragraph("Métricas de Disponibilidad", self.styles['Heading1_Custom']))
        
        uptime = stats.get('uptime_percent', 0)
        
        # Metrics table
        metrics_data = [
            ["Métrica", "Valor", "Objetivo", "Estado"],
            ["Disponibilidad (%)", f"{uptime:.2f}%", f"{sla_target}%", 
             "✓ OK" if uptime >= sla_target else "✗ Fallo"],
            ["Tiempo de respuesta medio", f"{stats.get('avg_latency', 0):.0f} ms", "< 300 ms",
             "✓ OK" if stats.get('avg_latency', 0) < 300 else "⚠ Atención"],
            ["Incidentes críticos", str(stats.get('critical_incidents', 0)), "0",
             "✓ OK" if stats.get('critical_incidents', 0) == 0 else "✗ Fallo"],
            ["MTTR (tiempo medio recuperación)", f"{stats.get('mttr_minutes', 0):.0f} min", "< 30 min",
             "✓ OK" if stats.get('mttr_minutes', 0) < 30 else "⚠ Atención"],
        ]
        
        table = Table(metrics_data, colWidths=[180, 100, 100, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.BRAND_PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _create_device_stats_table(self, devices: List[Dict], stats: Dict) -> list:
        """Create device statistics table"""
        elements = []
        
        elements.append(Paragraph("Estado de Dispositivos por Organización", self.styles['Heading1_Custom']))
        
        # Group devices by organization
        org_stats = {}
        for device in devices:
            org_name = device.get('organization_name', 'Sin organización')
            if org_name not in org_stats:
                org_stats[org_name] = {'total': 0, 'online': 0, 'offline': 0}
            org_stats[org_name]['total'] += 1
            if device.get('status') == 'online':
                org_stats[org_name]['online'] += 1
            else:
                org_stats[org_name]['offline'] += 1
        
        # Create table data
        table_data = [["Organización", "Total", "Online", "Offline", "Disponibilidad"]]
        
        for org_name, ostats in sorted(org_stats.items()):
            availability = (ostats['online'] / ostats['total'] * 100) if ostats['total'] > 0 else 0
            table_data.append([
                org_name[:30] + "..." if len(org_name) > 30 else org_name,
                str(ostats['total']),
                str(ostats['online']),
                str(ostats['offline']),
                f"{availability:.1f}%"
            ])
        
        # Add totals row
        table_data.append([
            "TOTAL",
            str(stats.get('total', 0)),
            str(stats.get('online', 0)),
            str(stats.get('offline', 0)),
            f"{stats.get('uptime_percent', 0):.1f}%"
        ])
        
        table = Table(table_data, colWidths=[180, 70, 70, 70, 90])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.BRAND_SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#f9fafb")]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f3f4f6")),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _create_downtime_section(self, downtime_history: List[Dict]) -> list:
        """Create downtime history section"""
        elements = []
        
        elements.append(Paragraph("Historial de Incidencias", self.styles['Heading1_Custom']))
        
        # Sort by count descending
        sorted_history = sorted(downtime_history, key=lambda x: x.get('count', 0), reverse=True)[:15]
        
        table_data = [["Dispositivo", "Caídas", "Última Caída", "Impacto"]]
        
        for item in sorted_history:
            count = item.get('count', 0)
            impact = "Crítico" if count > 5 else "Alto" if count > 2 else "Bajo"
            last_down = item.get('lastDown', '')
            if last_down:
                try:
                    last_down = datetime.fromisoformat(last_down.replace('Z', '')).strftime('%d/%m %H:%M')
                except:
                    pass
            
            table_data.append([
                item.get('name', 'N/A')[:35],
                str(count),
                last_down or 'N/A',
                impact
            ])
        
        table = Table(table_data, colWidths=[200, 60, 120, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.BRAND_WARNING),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef3c7")]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _create_alerts_section(self, alerts: List[Dict]) -> list:
        """Create alerts summary section"""
        elements = []
        
        elements.append(Paragraph("Resumen de Alertas", self.styles['Heading1_Custom']))
        
        # Count alerts by type
        alert_types = {}
        for alert in alerts:
            atype = alert.get('alert_type', 'other')
            alert_types[atype] = alert_types.get(atype, 0) + 1
        
        type_names = {
            'device_down': 'Dispositivo caído',
            'device_up': 'Dispositivo recuperado',
            'nas_disconnected': 'NAS desconectado',
            'high_latency': 'Latencia alta',
            'other': 'Otros'
        }
        
        table_data = [["Tipo de Alerta", "Cantidad", "Porcentaje"]]
        total = len(alerts) or 1
        
        for atype, count in sorted(alert_types.items(), key=lambda x: x[1], reverse=True):
            table_data.append([
                type_names.get(atype, atype),
                str(count),
                f"{count/total*100:.1f}%"
            ])
        
        table = Table(table_data, colWidths=[250, 100, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.BRAND_SECONDARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(table)
        
        return elements
    
    def _create_footer(self) -> Paragraph:
        """Create report footer"""
        footer_html = """
        <font size="8" color="#9ca3af">
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br/>
        Generado por <b>Siempria Monitor</b> | www.siempria.com<br/>
        Este informe es confidencial y está destinado únicamente al destinatario indicado.
        </font>
        """
        return Paragraph(footer_html, self.styles['Footer_Custom'])


# Singleton instance
sla_report_generator = SLAReportGenerator()
