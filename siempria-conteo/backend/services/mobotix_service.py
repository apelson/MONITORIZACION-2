"""
Mobotix Counting Service - Fetches counting stats from Mobotix cameras
"""
import httpx
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from config import cameras_config_collection, daily_baselines_collection, logger


async def fetch_camera_counting(ip: str, port: int, username: str, password: str, timeout: int = 30) -> Optional[Dict[str, Any]]:
    """Fetch counting statistics from a single Mobotix camera"""
    try:
        url = f"https://{ip}:{port}/control/stat_export?report&export_type=week&export_range=current&export_format=json"
        auth = httpx.BasicAuth(username, password)
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            response = await client.get(url, auth=auth)
            if response.status_code == 200:
                return parse_mobotix_json(response.text)
        return None
    except Exception as e:
        logger.error(f"Error fetching from {ip}:{port}: {e}")
        return None


def parse_mobotix_json(json_text: str) -> Optional[Dict[str, Any]]:
    """Parse Mobotix counting JSON response"""
    try:
        data = json.loads(json_text)
        result = {"entries": 0, "exits": 0, "hourly_data": []}
        if data.get("error"):
            return result
        tables = data.get("tables", [])
        if not tables:
            return result
        for table in tables:
            table_data = table.get("data", [])
            if not table_data:
                continue
            today_idx = datetime.now().weekday()
            if today_idx < len(table_data):
                today_data = table_data[today_idx]
                for hour_data in today_data:
                    if isinstance(hour_data, list) and len(hour_data) >= 2:
                        if hour_data[0] >= 0:
                            result["entries"] += hour_data[0]
                        if hour_data[1] >= 0:
                            result["exits"] += hour_data[1]
        return result
    except Exception as e:
        logger.error(f"Error parsing Mobotix JSON: {e}")
        return None


async def fetch_all_cameras_counting() -> Dict[str, Any]:
    """Fetch counting data from all configured cameras"""
    cameras = await cameras_config_collection.find({"enabled": True}, {"_id": 0}).to_list(length=100)
    result = {"cameras": {}, "totals": {"entries": 0, "exits": 0}}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    tasks = []
    for cam in cameras:
        tasks.append((cam, fetch_camera_counting(
            cam["ip"], cam.get("port", 443),
            cam["username"], cam["password"]
        )))

    for cam, task in tasks:
        try:
            data = await task
            cam_id = cam["camera_id"]
            baseline = await daily_baselines_collection.find_one(
                {"camera_id": cam_id, "date": today}, {"_id": 0}
            )
            baseline_entries = baseline.get("entries", 0) if baseline else 0
            baseline_exits = baseline.get("exits", 0) if baseline else 0

            entries = max(0, (data.get("entries", 0) if data else 0) - baseline_entries)
            exits = max(0, (data.get("exits", 0) if data else 0) - baseline_exits)

            result["cameras"][cam_id] = {
                "camera_id": cam_id,
                "camera_name": cam.get("camera_name", ""),
                "brand_id": cam.get("brand_id", ""),
                "island": cam.get("island", ""),
                "ip": cam["ip"],
                "entries": entries,
                "exits": exits,
                "status": "online" if data else "offline",
                "raw_entries": data.get("entries", 0) if data else 0,
                "raw_exits": data.get("exits", 0) if data else 0,
                "baseline_entries": baseline_entries,
                "baseline_exits": baseline_exits
            }
            result["totals"]["entries"] += entries
            result["totals"]["exits"] += exits
        except Exception as e:
            logger.error(f"Error processing camera {cam.get('camera_id')}: {e}")

    return result
