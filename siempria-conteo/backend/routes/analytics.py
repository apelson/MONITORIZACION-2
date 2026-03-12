"""
Analytics Routes - Export, Comparison, Executive KPIs
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv
import io

from config import db, logger, cameras_config_collection
from services.auth_service import get_current_user

camera_readings_collection = db["camera_readings"]
hourly_snapshots_collection = db["hourly_snapshots"]
goals_collection = db["goals"]

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/export")
async def export_data(
    from_date: str = Query(..., description="YYYY-MM-DD"),
    to_date: str = Query(..., description="YYYY-MM-DD"),
    brand_id: Optional[str] = Query(default=None),
    island: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Export historical data as CSV"""
    query = {"date": {"$gte": from_date, "$lte": to_date}}
    if brand_id:
        query["brand_id"] = brand_id
    if island:
        query["island"] = island

    readings = await camera_readings_collection.find(
        query, {"_id": 0, "image_b64": 0}
    ).sort([("date", 1), ("hour", 1)]).to_list(50000)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Fecha", "Hora", "Camara", "Marca", "Isla", "Entradas", "Salidas", "Estado"])

    for r in readings:
        writer.writerow([
            r.get("date", ""),
            f"{r.get('hour', 0):02d}:00",
            r.get("camera_name", r.get("camera_id", "")),
            r.get("brand_id", ""),
            r.get("island", ""),
            r.get("entries", 0),
            r.get("exits", 0),
            r.get("status", "")
        ])

    output.seek(0)
    filename = f"conteo_export_{from_date}_{to_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/comparison")
async def get_comparison(
    period: str = Query(default="week", description="week or month"),
    current_user: dict = Depends(get_current_user)
):
    """Compare current period vs previous period"""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")

    if period == "week":
        # Current week: Monday to today
        weekday = now.weekday()
        current_start = (now - timedelta(days=weekday)).strftime("%Y-%m-%d")
        # Previous week
        prev_start = (now - timedelta(days=weekday + 7)).strftime("%Y-%m-%d")
        prev_end = (now - timedelta(days=weekday + 1)).strftime("%Y-%m-%d")
        # Same number of days for fair comparison
        days_elapsed = weekday + 1
        prev_compare_end = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        label_current = "Esta semana"
        label_previous = "Semana pasada"
    else:
        # Current month: 1st to today
        current_start = now.strftime("%Y-%m-01")
        day_of_month = now.day
        # Previous month
        first_of_month = now.replace(day=1)
        last_month_end = first_of_month - timedelta(days=1)
        prev_start = last_month_end.replace(day=1).strftime("%Y-%m-%d")
        prev_compare_end = last_month_end.replace(day=min(day_of_month, last_month_end.day)).strftime("%Y-%m-%d")
        days_elapsed = day_of_month
        label_current = "Este mes"
        label_previous = "Mes pasado"

    # Fetch snapshots for both periods
    current_snaps = await hourly_snapshots_collection.find(
        {"date": {"$gte": current_start, "$lte": today}},
        {"_id": 0}
    ).to_list(5000)

    prev_snaps = await hourly_snapshots_collection.find(
        {"date": {"$gte": prev_start, "$lte": prev_compare_end}},
        {"_id": 0}
    ).to_list(5000)

    # Aggregate by day
    def aggregate_daily(snaps):
        daily = {}
        brands = {}
        for s in snaps:
            d = s["date"]
            entries = s.get("total_entries", 0)
            daily[d] = max(daily.get(d, 0), entries)
            for bid, bdata in s.get("brands", {}).items():
                if bid not in brands:
                    brands[bid] = {}
                brands[bid][d] = max(brands[bid].get(d, 0), bdata.get("entries", 0))
        return daily, brands

    curr_daily, curr_brands = aggregate_daily(current_snaps)
    prev_daily, prev_brands = aggregate_daily(prev_snaps)

    curr_total = sum(curr_daily.values())
    prev_total = sum(prev_daily.values())
    change_pct = round(((curr_total - prev_total) / max(prev_total, 1)) * 100, 1) if prev_total > 0 else 0

    # Brand comparison
    all_brands = set(list(curr_brands.keys()) + list(prev_brands.keys()))
    brand_comparison = []
    for bid in all_brands:
        curr_b = sum(curr_brands.get(bid, {}).values())
        prev_b = sum(prev_brands.get(bid, {}).values())
        pct = round(((curr_b - prev_b) / max(prev_b, 1)) * 100, 1) if prev_b > 0 else 0
        brand_comparison.append({
            "brand_id": bid,
            "current": curr_b,
            "previous": prev_b,
            "change_pct": pct
        })

    brand_comparison.sort(key=lambda x: x["change_pct"], reverse=True)

    return {
        "period": period,
        "label_current": label_current,
        "label_previous": label_previous,
        "current_total": curr_total,
        "previous_total": prev_total,
        "change_pct": change_pct,
        "days_compared": days_elapsed,
        "brand_comparison": brand_comparison,
        "current_daily": [{"date": d, "entries": v} for d, v in sorted(curr_daily.items())],
        "previous_daily": [{"date": d, "entries": v} for d, v in sorted(prev_daily.items())]
    }


@router.get("/executive")
async def get_executive_kpis(current_user: dict = Depends(get_current_user)):
    """Executive dashboard KPIs"""
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    month_start = now.strftime("%Y-%m-01")
    month_key = now.strftime("%Y-%m")

    # Today's total
    today_snaps = await hourly_snapshots_collection.find(
        {"date": today}, {"_id": 0}
    ).to_list(100)
    today_total = max((s.get("total_entries", 0) for s in today_snaps), default=0)

    # Yesterday's total
    yest_snaps = await hourly_snapshots_collection.find(
        {"date": yesterday}, {"_id": 0}
    ).to_list(100)
    yesterday_total = max((s.get("total_entries", 0) for s in yest_snaps), default=0)

    # Month total
    month_snaps = await hourly_snapshots_collection.find(
        {"date": {"$gte": month_start}}, {"_id": 0}
    ).to_list(5000)
    month_daily = {}
    for s in month_snaps:
        d = s["date"]
        month_daily[d] = max(month_daily.get(d, 0), s.get("total_entries", 0))
    month_total = sum(month_daily.values())

    # Cameras status
    cameras = await cameras_config_collection.find(
        {"enabled": {"$ne": False}}, {"_id": 0}
    ).to_list(200)
    total_cameras = len(cameras)
    # Get latest snapshot for online status
    latest = today_snaps[-1] if today_snaps else {}
    online_cameras = latest.get("cameras_online", 0)

    # Goals progress
    goals = await goals_collection.find(
        {"month": month_key}, {"_id": 0}
    ).to_list(100)

    # Brand totals this month
    brand_month = {}
    for s in month_snaps:
        for bid, bdata in s.get("brands", {}).items():
            if bid not in brand_month:
                brand_month[bid] = {}
            d = s["date"]
            brand_month[bid][d] = max(brand_month[bid].get(d, 0), bdata.get("entries", 0))

    goals_progress = []
    for g in goals:
        bid = g["brand_id"]
        actual = sum(brand_month.get(bid, {}).values())
        target = g.get("target_visits", 1)
        pct = round((actual / target) * 100, 1)
        days_in_month = 30
        days_elapsed = now.day
        projected = round((actual / max(days_elapsed, 1)) * days_in_month) if days_elapsed > 0 else 0
        projected_pct = round((projected / target) * 100, 1)
        goals_progress.append({
            "brand_id": bid,
            "target": target,
            "actual": actual,
            "pct": pct,
            "projected": projected,
            "projected_pct": projected_pct,
            "label": g.get("label", "")
        })

    # Daily average
    active_days = len(month_daily) or 1
    daily_avg = round(month_total / active_days)

    day_change = round(((today_total - yesterday_total) / max(yesterday_total, 1)) * 100, 1) if yesterday_total > 0 else 0

    return {
        "today_total": today_total,
        "yesterday_total": yesterday_total,
        "day_change_pct": day_change,
        "month_total": month_total,
        "daily_avg": daily_avg,
        "active_days": active_days,
        "cameras_total": total_cameras,
        "cameras_online": online_cameras,
        "goals_progress": goals_progress,
        "month": month_key
    }
