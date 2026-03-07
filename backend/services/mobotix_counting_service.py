"""
Mobotix Counting Service - Fetches counting statistics from Mobotix cameras
"""
import httpx
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import asyncio
import urllib3
import ssl

from config import db, logger

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


async def fetch_camera_counting(
    ip: str, 
    port: int, 
    username: str, 
    password: str,
    timeout: int = 30
) -> Optional[Dict[str, Any]]:
    """
    Fetch counting statistics from a single Mobotix camera.
    Uses the MxAnalytics stat_export endpoint with JSON format.
    """
    try:
        # Mobotix JSON format endpoint
        url = f"https://{ip}:{port}/control/stat_export?report&export_type=week&export_range=current&export_format=json"
        
        auth = httpx.BasicAuth(username, password)
        
        try:
            async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
                response = await client.get(url, auth=auth)
                
                if response.status_code == 200:
                    data = parse_mobotix_json_response(response.text)
                    if data:
                        data["fetch_url"] = url
                        data["fetch_time"] = datetime.now(timezone.utc).isoformat()
                        return data
        except Exception as e:
            logger.debug(f"Failed to fetch from {url}: {e}")
        
        return None
        
    except Exception as e:
        logger.error(f"Error fetching counting from {ip}:{port}: {e}")
        return None


def parse_mobotix_json_response(json_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse the Mobotix counting JSON response.
    Expected format:
    {
        "error": false,
        "feature": true,
        "tables": [{
            "directions": ["North", "South"],
            "data": [[[-1,-1],...], ..., [[27, 43], [39, 32], ...]]
        }]
    }
    
    The last row of data contains totals.
    Typically: North = Entries, South = Exits (or vice versa depending on camera config)
    """
    try:
        data = json.loads(json_text)
        
        result = {
            "entries": 0,
            "exits": 0,
            "hourly_data": [],
            "raw_tables": []
        }
        
        if data.get("error"):
            return result
        
        tables = data.get("tables", [])
        if not tables:
            return result
        
        for table in tables:
            table_data = table.get("data", [])
            directions = table.get("directions", ["In", "Out"])
            row_titles = table.get("rowTitles", [])
            
            result["raw_tables"].append({
                "type": table.get("type", "unknown"),
                "title": table.get("title", ""),
                "directions": directions,
                "row_titles": row_titles,
                "column_titles": table.get("columnTitles", [])
            })
            
            if not table_data:
                continue
            
            # The last row typically contains totals
            # But we need to find the row with rowTitle "Total"
            total_row_index = -1
            for i, title in enumerate(row_titles):
                if title and "Total" in title:
                    total_row_index = i
                    break
            
            if total_row_index == -1:
                total_row_index = len(table_data) - 1
            
            if total_row_index < len(table_data):
                total_row = table_data[total_row_index]
                
                # Total row format: [[day1_dir1, day1_dir2], [day2_dir1, day2_dir2], ...]
                # Last column typically has weekly total
                if total_row:
                    # Get the last valid column (weekly total)
                    for col in reversed(total_row):
                        if col and len(col) >= 2 and col[0] >= 0 and col[1] >= 0:
                            # Assume first direction is entries, second is exits
                            # This can be adjusted based on camera configuration
                            result["entries"] = col[0]
                            result["exits"] = col[1]
                            break
            
            # Also collect hourly data for detailed charts
            for i, row in enumerate(table_data[:-1]):  # Skip total row
                if i < len(row_titles) and row:
                    hourly = {
                        "time": row_titles[i] if i < len(row_titles) else f"Hour {i}",
                        "entries": 0,
                        "exits": 0
                    }
                    
                    # Sum all valid columns for this hour
                    for col in row:
                        if col and len(col) >= 2:
                            if col[0] >= 0:
                                hourly["entries"] += col[0]
                            if col[1] >= 0:
                                hourly["exits"] += col[1]
                    
                    if hourly["entries"] > 0 or hourly["exits"] > 0:
                        result["hourly_data"].append(hourly)
        
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return None
    except Exception as e:
        logger.error(f"Error parsing Mobotix JSON response: {e}")
        return None


async def fetch_all_cameras_counting() -> Dict[str, Any]:
    """
    Fetch counting statistics from all configured cameras.
    Returns aggregated data by brand and camera.
    """
    cameras_config_collection = db["brand_cameras_config"]
    cameras = await cameras_config_collection.find({"enabled": True}, {"_id": 0}).to_list(length=100)
    
    result = {
        "cameras": {},
        "totals": {"entries": 0, "exits": 0},
        "by_brand": {},
        "by_island": {},
        "fetch_time": datetime.now(timezone.utc).isoformat()
    }
    
    if not cameras:
        logger.info("No cameras configured for counting")
        return result
    
    # Fetch data from all cameras concurrently
    tasks = []
    for cam in cameras:
        tasks.append(fetch_camera_counting(
            ip=cam["ip"],
            port=cam.get("port", 443),
            username=cam["username"],
            password=cam["password"]
        ))
    
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    for cam, response in zip(cameras, responses):
        camera_id = cam["camera_id"]
        brand_id = cam.get("brand_id", "unknown")
        island = cam.get("island", "unknown")
        
        if isinstance(response, Exception):
            logger.error(f"Error fetching camera {camera_id}: {response}")
            result["cameras"][camera_id] = {
                "status": "error",
                "error": str(response),
                "camera_name": cam.get("camera_name", camera_id),
                "brand_id": brand_id,
                "island": island
            }
            continue
        
        if response:
            entries = response.get("entries", 0)
            exits = response.get("exits", 0)
            
            result["cameras"][camera_id] = {
                "status": "online",
                "camera_name": cam.get("camera_name", camera_id),
                "brand_id": brand_id,
                "island": island,
                "entries": entries,
                "exits": exits,
                "total": entries + exits,
                "fetch_time": response.get("fetch_time")
            }
            
            result["totals"]["entries"] += entries
            result["totals"]["exits"] += exits
            
            # Aggregate by brand
            if brand_id not in result["by_brand"]:
                result["by_brand"][brand_id] = {"entries": 0, "exits": 0, "cameras": 0}
            result["by_brand"][brand_id]["entries"] += entries
            result["by_brand"][brand_id]["exits"] += exits
            result["by_brand"][brand_id]["cameras"] += 1
            
            # Aggregate by island
            if island not in result["by_island"]:
                result["by_island"][island] = {"entries": 0, "exits": 0, "cameras": 0}
            result["by_island"][island]["entries"] += entries
            result["by_island"][island]["exits"] += exits
            result["by_island"][island]["cameras"] += 1
        else:
            result["cameras"][camera_id] = {
                "status": "offline",
                "camera_name": cam.get("camera_name", camera_id),
                "brand_id": brand_id,
                "island": island,
                "error": "No response from camera"
            }
    
    return result


async def store_daily_counting_snapshot():
    """
    Store a daily snapshot of counting data for historical analysis.
    Should be called once per day by a scheduler.
    """
    from routes.brand_statistics import brand_daily_collection
    
    data = await fetch_all_cameras_counting()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for brand_id, brand_data in data.get("by_brand", {}).items():
        await brand_daily_collection.update_one(
            {"brand_id": brand_id, "date": today},
            {
                "$set": {
                    "entries": brand_data["entries"],
                    "exits": brand_data["exits"],
                    "total_visits": brand_data["entries"] + brand_data["exits"],
                    "cameras_count": brand_data["cameras"],
                    "snapshot_time": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
    
    logger.info(f"Stored daily counting snapshot for {today}")
    return {"date": today, "brands_updated": len(data.get("by_brand", {}))}
