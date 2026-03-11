"""
Mobotix Counting Service - Fetches counting stats from Mobotix cameras
Mobotix data structure:
  - rows = hours (0-23, row 24 = total)
  - columns = days: Monday(0), Tuesday(1), Wednesday(2), Thursday(3), Friday(4), Saturday(5), Week-Total(6)
  - each cell = [North_count, South_count]  (entries, exits)
  - negative values (-1, -2) = no data / future
"""
import httpx
import json
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
    """Parse Mobotix counting JSON response
    Structure: data[hour][day_column] = [entries, exits]
    Columns: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Total=6
    """
    try:
        data = json.loads(json_text)
        result = {"entries": 0, "exits": 0}

        if data.get("error"):
            return result

        tables = data.get("tables", [])
        if not tables:
            return result

        today_col = datetime.now().weekday()  # Monday=0 ... Sunday=6

        for table in tables:
            table_data = table.get("data", [])
            if not table_data:
                continue

            # Iterate over hours (rows), skip last row if it's a total
            num_hours = min(len(table_data), 24)
            for hour_idx in range(num_hours):
                hour_row = table_data[hour_idx]

                # Each hour_row is a list of [entries, exits] per day column
                if today_col < len(hour_row):
                    cell = hour_row[today_col]
                    if isinstance(cell, list) and len(cell) >= 2:
                        # Only count positive values (negative = no data or future)
                        if cell[0] > 0:
                            result["entries"] += cell[0]
                        if cell[1] > 0:
                            result["exits"] += cell[1]

        return result

    except Exception as e:
        logger.error(f"Error parsing Mobotix JSON: {e}")
        return None


async def fetch_all_cameras_counting() -> Dict[str, Any]:
    """Fetch counting data from all configured cameras"""
    cameras = await cameras_config_collection.find({"enabled": True}, {"_id": 0}).to_list(length=100)
    result = {"cameras": {}, "totals": {"entries": 0, "exits": 0}}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for cam in cameras:
        cam_id = cam.get("camera_id")
        if not cam_id:
            continue
        try:
            data = await fetch_camera_counting(
                cam["ip"], cam.get("port", 443),
                cam["username"], cam["password"]
            )

            baseline = await daily_baselines_collection.find_one(
                {"camera_id": cam_id, "date": today}, {"_id": 0}
            )
            baseline_entries = baseline.get("entries", 0) if baseline else 0
            baseline_exits = baseline.get("exits", 0) if baseline else 0

            raw_entries = data.get("entries", 0) if data else 0
            raw_exits = data.get("exits", 0) if data else 0
            entries = max(0, raw_entries - baseline_entries)
            exits = max(0, raw_exits - baseline_exits)

            result["cameras"][cam_id] = {
                "camera_id": cam_id,
                "camera_name": cam.get("camera_name", ""),
                "brand_id": cam.get("brand_id", ""),
                "island": cam.get("island", ""),
                "ip": cam["ip"],
                "port": cam.get("port", 443),
                "entries": entries,
                "exits": exits,
                "status": "online" if data else "offline",
                "raw_entries": raw_entries,
                "raw_exits": raw_exits,
                "baseline_entries": baseline_entries,
                "baseline_exits": baseline_exits
            }
            result["totals"]["entries"] += entries
            result["totals"]["exits"] += exits
        except Exception as e:
            logger.error(f"Error processing camera {cam_id}: {e}")
            result["cameras"][cam_id] = {
                "camera_id": cam_id,
                "camera_name": cam.get("camera_name", ""),
                "brand_id": cam.get("brand_id", ""),
                "island": cam.get("island", ""),
                "ip": cam.get("ip", ""),
                "port": cam.get("port", 443),
                "entries": 0, "exits": 0,
                "status": "error",
                "raw_entries": 0, "raw_exits": 0,
                "baseline_entries": 0, "baseline_exits": 0
            }

    return result
