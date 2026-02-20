"""
Backup Service - Automated backup system
"""
import os
import json
import shutil
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path
import gzip


class BackupService:
    def __init__(self, db, backup_dir: str = "/opt/siempria-monitor/backups"):
        self.db = db
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.config_collection = "backup_config"
    
    async def get_config(self) -> Dict[str, Any]:
        """Get backup configuration"""
        config = await self.db.settings.find_one({"type": self.config_collection})
        if config:
            return {
                "frequency": config.get("frequency", "daily"),
                "time": config.get("time", "03:00"),
                "retention": config.get("retention", 30),
                "location": config.get("location", "local"),
                "email_notify": config.get("email_notify", True),
                "include_images": config.get("include_images", False),
                "include_logs": config.get("include_logs", True),
                "enabled": config.get("enabled", False),
                "last_backup": config.get("last_backup"),
                "s3_bucket": config.get("s3_bucket"),
                "s3_prefix": config.get("s3_prefix", "backups/")
            }
        return {
            "frequency": "daily",
            "time": "03:00",
            "retention": 30,
            "location": "local",
            "email_notify": True,
            "include_images": False,
            "include_logs": True,
            "enabled": False
        }
    
    async def save_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Save backup configuration"""
        config["type"] = self.config_collection
        config["updated_at"] = datetime.utcnow()
        
        await self.db.settings.update_one(
            {"type": self.config_collection},
            {"$set": config},
            upsert=True
        )
        return config
    
    async def run_backup(self, include_images: bool = False, include_logs: bool = True) -> Dict[str, Any]:
        """Execute a manual backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        try:
            # Export collections
            collections_to_backup = [
                "devices", "organizations", "groups", "users", 
                "alerts", "incidents", "device_types", "settings",
                "dahua_devices", "roles"
            ]
            
            if include_logs:
                collections_to_backup.append("access_logs")
            
            backup_data = {
                "backup_date": datetime.now().isoformat(),
                "version": "1.0",
                "collections": {}
            }
            
            for collection_name in collections_to_backup:
                collection = self.db[collection_name]
                docs = []
                async for doc in collection.find({}):
                    # Convert ObjectId to string
                    doc_dict = {}
                    for key, value in doc.items():
                        if key == '_id':
                            doc_dict['_id'] = str(value)
                        elif hasattr(value, 'isoformat'):
                            doc_dict[key] = value.isoformat()
                        else:
                            doc_dict[key] = value
                    docs.append(doc_dict)
                
                backup_data["collections"][collection_name] = docs
            
            # Write JSON backup
            json_file = backup_path / "data.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
            
            # Compress backup
            archive_path = self.backup_dir / f"{backup_name}.tar.gz"
            shutil.make_archive(
                str(backup_path),
                'gztar',
                self.backup_dir,
                backup_name
            )
            
            # Clean up uncompressed folder
            shutil.rmtree(backup_path)
            
            # Get file size
            file_size = os.path.getsize(archive_path)
            size_str = self._format_size(file_size)
            
            # Update last backup in config
            await self.db.settings.update_one(
                {"type": self.config_collection},
                {"$set": {
                    "last_backup": {
                        "filename": f"{backup_name}.tar.gz",
                        "created_at": datetime.utcnow(),
                        "size": size_str,
                        "collections": len(collections_to_backup)
                    }
                }},
                upsert=True
            )
            
            # Clean old backups
            await self.cleanup_old_backups()
            
            return {
                "success": True,
                "filename": f"{backup_name}.tar.gz",
                "path": str(archive_path),
                "size": size_str,
                "created_at": datetime.now().isoformat(),
                "collections": len(collections_to_backup)
            }
            
        except Exception as e:
            # Clean up on error
            if backup_path.exists():
                shutil.rmtree(backup_path)
            raise Exception(f"Backup failed: {str(e)}")
    
    async def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        config = await self.get_config()
        retention_days = config.get("retention", 30)
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        for backup_file in self.backup_dir.glob("backup_*.tar.gz"):
            try:
                # Extract date from filename
                date_str = backup_file.stem.replace("backup_", "").split("_")[0]
                file_date = datetime.strptime(date_str, "%Y%m%d")
                
                if file_date < cutoff_date:
                    backup_file.unlink()
            except (ValueError, IndexError):
                continue
    
    async def list_backups(self) -> list:
        """List all available backups"""
        backups = []
        for backup_file in sorted(self.backup_dir.glob("backup_*.tar.gz"), reverse=True):
            stat = backup_file.stat()
            backups.append({
                "filename": backup_file.name,
                "size": self._format_size(stat.st_size),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        return backups
    
    async def download_backup(self, filename: str) -> Path:
        """Get path to a backup file for download"""
        backup_path = self.backup_dir / filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {filename}")
        return backup_path
    
    async def delete_backup(self, filename: str) -> bool:
        """Delete a backup file"""
        backup_path = self.backup_dir / filename
        if backup_path.exists():
            backup_path.unlink()
            return True
        return False
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size for display"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
