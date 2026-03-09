"""
PDF Export Routes - Brand Statistics Reports with Comparisons
Generates PDF reports with period comparisons (day, week, month)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import io

from config import db, logger
from services.auth_service import get_current_user

router = APIRouter(prefix="/brand-statistics/export", tags=["brand-statistics-export"])

# Collections
brand_daily_collection = db["brand_daily_statistics"]
brand_weekly_collection = db["brand_weekly_statistics"]
brands_collection = db["brands"]
centers_collection = db["centers"]

def get_date_range(period: str, reference_date: datetime = None):
    """Calculate date ranges for current and previous periods"""
    if reference_date is None:
        reference_date = datetime.now(timezone.utc)
    
    if period == "day":
        current_start = reference_date.replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = current_start + timedelta(days=1)
        previous_start = current_start - timedelta(days=1)
        previous_end = current_start
    elif period == "week":
        # Start of current week (Monday)
        days_since_monday = reference_date.weekday()
        current_start = (reference_date - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        current_end = current_start + timedelta(days=7)
        previous_start = current_start - timedelta(days=7)
        previous_end = current_start
    elif period == "month":
        current_start = reference_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Next month
        if current_start.month == 12:
            current_end = current_start.replace(year=current_start.year + 1, month=1)
        else:
            current_end = current_start.replace(month=current_start.month + 1)
        # Previous month
        if current_start.month == 1:
            previous_start = current_start.replace(year=current_start.year - 1, month=12)
        else:
            previous_start = current_start.replace(month=current_start.month - 1)
        previous_end = current_start
    else:
        raise ValueError(f"Unknown period: {period}")
    
    return {
        "current": {"start": current_start, "end": current_end},
        "previous": {"start": previous_start, "end": previous_end}
    }

async def get_statistics_for_period(start_date: datetime, end_date: datetime):
    """Aggregate statistics for a date range"""
    pipeline = [
        {
            "$match": {
                "date": {
                    "$gte": start_date.strftime("%Y-%m-%d"),
                    "$lt": end_date.strftime("%Y-%m-%d")
                }
            }
        },
        {
            "$group": {
                "_id": "$brand_id",
                "total_visits": {"$sum": "$total_count"},
                "brand_name": {"$first": "$brand_name"},
                "brand_color": {"$first": "$brand_color"}
            }
        },
        {"$sort": {"total_visits": -1}}
    ]
    
    results = await brand_daily_collection.aggregate(pipeline).to_list(length=100)
    return results

def calculate_change(current: int, previous: int) -> dict:
    """Calculate percentage change between periods"""
    if previous == 0:
        if current == 0:
            return {"value": 0, "percent": 0, "direction": "equal"}
        return {"value": current, "percent": 100, "direction": "up"}
    
    change = current - previous
    percent = round((change / previous) * 100, 1)
    direction = "up" if change > 0 else "down" if change < 0 else "equal"
    
    return {"value": abs(change), "percent": abs(percent), "direction": direction}

def generate_pdf_content(data: dict) -> bytes:
    """Generate PDF using ReportLab"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError:
        raise HTTPException(status_code=500, detail="ReportLab no está instalado")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15,
        alignment=TA_CENTER
    )
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=20,
        spaceAfter=10
    )
    
    # Title
    elements.append(Paragraph("📊 Informe de Visitas", title_style))
    elements.append(Paragraph(f"Período: {data['period_label']}", subtitle_style))
    elements.append(Paragraph(f"Generado: {data['generated_at']}", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Summary section
    elements.append(Paragraph("Resumen General", section_style))
    
    summary_data = [
        ["Métrica", "Actual", "Anterior", "Cambio"],
        [
            "Total Visitas",
            str(data['summary']['current_total']),
            str(data['summary']['previous_total']),
            f"{data['summary']['change']['direction']} {data['summary']['change']['percent']}%"
        ],
        [
            "Promedio por Marca",
            str(data['summary']['current_avg']),
            str(data['summary']['previous_avg']),
            "-"
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Ranking section
    elements.append(Paragraph("🏆 Ranking de Marcas", section_style))
    
    ranking_headers = ["#", "Marca", "Visitas Actuales", "Visitas Anteriores", "Variación"]
    ranking_data = [ranking_headers]
    
    for i, brand in enumerate(data['ranking'], 1):
        change_symbol = "↑" if brand['change']['direction'] == 'up' else "↓" if brand['change']['direction'] == 'down' else "="
        change_text = f"{change_symbol} {brand['change']['percent']}%"
        ranking_data.append([
            str(i),
            brand['name'],
            str(brand['current']),
            str(brand['previous']),
            change_text
        ])
    
    ranking_table = Table(ranking_data, colWidths=[0.5*inch, 2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    
    # Color rows based on change
    table_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]
    
    # Add row colors based on ranking
    for i, brand in enumerate(data['ranking'], 1):
        if i == 1:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fef3c7')))  # Gold
        elif i == 2:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f1f5f9')))  # Silver
        elif i == 3:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fed7aa')))  # Bronze
    
    ranking_table.setStyle(TableStyle(table_style))
    elements.append(ranking_table)
    elements.append(Spacer(1, 30))
    
    # Top performers section
    if data.get('top_gainers'):
        elements.append(Paragraph("📈 Mayor Crecimiento", section_style))
        gainers_data = [["Marca", "Crecimiento"]]
        for g in data['top_gainers'][:3]:
            gainers_data.append([g['name'], f"+{g['change']['percent']}%"])
        
        gainers_table = Table(gainers_data, colWidths=[3*inch, 2*inch])
        gainers_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(gainers_table)
    
    # Footer
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph("WatchTower by Siempria - Sistema de Monitorización", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

@router.get("/pdf")
async def export_pdf_report(
    period: str = Query("day", description="Período: day, week, month"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate PDF report with period comparison.
    Compares current period vs previous period of same duration.
    """
    try:
        # Get date ranges
        ranges = get_date_range(period)
        
        # Get statistics for both periods
        current_stats = await get_statistics_for_period(
            ranges["current"]["start"], 
            ranges["current"]["end"]
        )
        previous_stats = await get_statistics_for_period(
            ranges["previous"]["start"], 
            ranges["previous"]["end"]
        )
        
        # Create lookup for previous period
        previous_lookup = {s["_id"]: s["total_visits"] for s in previous_stats}
        
        # Build ranking with comparisons
        ranking = []
        for stat in current_stats:
            brand_id = stat["_id"]
            current_visits = stat["total_visits"]
            previous_visits = previous_lookup.get(brand_id, 0)
            
            ranking.append({
                "id": brand_id,
                "name": stat.get("brand_name", brand_id),
                "current": current_visits,
                "previous": previous_visits,
                "change": calculate_change(current_visits, previous_visits)
            })
        
        # Calculate totals
        current_total = sum(s["total_visits"] for s in current_stats)
        previous_total = sum(s["total_visits"] for s in previous_stats)
        
        # Find top gainers (brands with highest growth)
        top_gainers = sorted(
            [r for r in ranking if r["change"]["direction"] == "up"],
            key=lambda x: x["change"]["percent"],
            reverse=True
        )
        
        # Period labels
        period_labels = {
            "day": f"Día ({ranges['current']['start'].strftime('%d/%m/%Y')})",
            "week": f"Semana ({ranges['current']['start'].strftime('%d/%m')} - {ranges['current']['end'].strftime('%d/%m/%Y')})",
            "month": f"Mes ({ranges['current']['start'].strftime('%B %Y')})"
        }
        
        # Prepare data for PDF
        report_data = {
            "period": period,
            "period_label": period_labels.get(period, period),
            "generated_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"),
            "summary": {
                "current_total": current_total,
                "previous_total": previous_total,
                "current_avg": round(current_total / max(len(current_stats), 1)),
                "previous_avg": round(previous_total / max(len(previous_stats), 1)),
                "change": calculate_change(current_total, previous_total)
            },
            "ranking": ranking,
            "top_gainers": top_gainers
        }
        
        # Generate PDF
        pdf_content = generate_pdf_content(report_data)
        
        filename = f"informe_visitas_{period}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

@router.get("/json")
async def export_json_report(
    period: str = Query("day", description="Período: day, week, month"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get report data as JSON (same data used for PDF).
    Useful for frontend visualization.
    """
    try:
        ranges = get_date_range(period)
        
        current_stats = await get_statistics_for_period(
            ranges["current"]["start"], 
            ranges["current"]["end"]
        )
        previous_stats = await get_statistics_for_period(
            ranges["previous"]["start"], 
            ranges["previous"]["end"]
        )
        
        previous_lookup = {s["_id"]: s["total_visits"] for s in previous_stats}
        
        ranking = []
        for stat in current_stats:
            brand_id = stat["_id"]
            current_visits = stat["total_visits"]
            previous_visits = previous_lookup.get(brand_id, 0)
            
            ranking.append({
                "id": brand_id,
                "name": stat.get("brand_name", brand_id),
                "color": stat.get("brand_color", "#666666"),
                "current": current_visits,
                "previous": previous_visits,
                "change": calculate_change(current_visits, previous_visits)
            })
        
        current_total = sum(s["total_visits"] for s in current_stats)
        previous_total = sum(s["total_visits"] for s in previous_stats)
        
        return {
            "period": period,
            "ranges": {
                "current": {
                    "start": ranges["current"]["start"].isoformat(),
                    "end": ranges["current"]["end"].isoformat()
                },
                "previous": {
                    "start": ranges["previous"]["start"].isoformat(),
                    "end": ranges["previous"]["end"].isoformat()
                }
            },
            "summary": {
                "current_total": current_total,
                "previous_total": previous_total,
                "change": calculate_change(current_total, previous_total)
            },
            "ranking": ranking
        }
        
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
