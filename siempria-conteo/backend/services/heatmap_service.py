"""
Heatmap Service - Fetch and store Mobotix heatmap images
"""
import httpx
import re
import asyncio
import base64
from datetime import datetime, timezone
from typing import Optional
from config import cameras_config_collection, logger

# MongoDB collection for heatmaps (imported in routes)


async def fetch_heatmap_from_camera(
    ip: str, port: int, username: str, password: str,
    heatmap_profile: str, custom_range: Optional[str] = None,
    timeout: int = 30
) -> Optional[bytes]:
    """
    Fetch a heatmap JPEG from a Mobotix camera.
    Flow: 1) Request HTML to get generation ID, 2) Wait for generation, 3) Download JPEG
    """
    try:
        # Step 1: Request HTML to trigger heatmap generation
        url = f"https://{ip}:{port}/control/stat_export_api?export_format=html&heatmap_profile={heatmap_profile}"
        if custom_range:
            url += f"&custom_range={custom_range}"

        auth = httpx.BasicAuth(username, password)
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            response = await client.get(url, auth=auth)
            if response.status_code != 200:
                logger.error(f"Heatmap HTML request failed: {response.status_code}")
                return None

            html = response.text
            # Extract the heatmap generation ID
            match = re.search(r'loadHeatmap\((\d+)\)', html)
            if not match:
                logger.error("Could not extract heatmap ID from HTML")
                return None

            hm_id = match.group(1)
            logger.info(f"Heatmap generation triggered, ID: {hm_id}")

            # Step 2: Wait for the camera to generate the heatmap
            await asyncio.sleep(10)

            # Step 3: Download the JPEG image
            jpeg_url = f"https://{ip}:{port}/control/stat_export?download&_={hm_id}&heatmap.jpeg"
            img_response = await client.get(jpeg_url, auth=auth)

            if img_response.status_code == 200 and len(img_response.content) > 100:
                # Verify it's a real JPEG (starts with FF D8)
                if img_response.content[:2] == b'\xff\xd8':
                    logger.info(f"Heatmap downloaded: {len(img_response.content)} bytes")
                    return img_response.content
                else:
                    logger.error("Downloaded file is not a valid JPEG")
                    return None
            else:
                content = img_response.content.decode('utf-8', errors='ignore')
                logger.error(f"Heatmap download failed: {content[:100]}")

                # Retry once after more wait
                await asyncio.sleep(5)
                img_response = await client.get(jpeg_url, auth=auth)
                if img_response.status_code == 200 and img_response.content[:2] == b'\xff\xd8':
                    return img_response.content

                return None

    except Exception as e:
        logger.error(f"Heatmap fetch error from {ip}:{port}: {e}")
        return None


async def get_camera_with_heatmap(camera_id: str) -> Optional[dict]:
    """Get camera config with heatmap profile"""
    camera = await cameras_config_collection.find_one(
        {"camera_id": camera_id, "heatmap_profile": {"$exists": True, "$ne": ""}},
        {"_id": 0}
    )
    return camera
