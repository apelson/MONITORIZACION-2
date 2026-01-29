"""
Database optimization script for Siempria Network Monitor
Creates indexes and optimizes collections for better performance
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_indexes():
    """Create database indexes for optimal query performance"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔧 Creando índices de base de datos para optimización...")
    
    # ============ DEVICES COLLECTION ============
    print("  📦 Colección: devices")
    await db.devices.create_index("id", unique=True, background=True)
    await db.devices.create_index("group_id", background=True)
    await db.devices.create_index("status", background=True)
    await db.devices.create_index("device_type_id", background=True)
    await db.devices.create_index("ip_address", background=True)
    await db.devices.create_index([("ip_address", 1), ("port", 1)], unique=True, background=True)
    await db.devices.create_index([("status", 1), ("device_type_id", 1)], background=True)  # Compound for operator queries
    print("    ✅ 7 índices creados")
    
    # ============ USERS COLLECTION ============
    print("  👤 Colección: users")
    await db.users.create_index("id", unique=True, background=True)
    await db.users.create_index("username", unique=True, background=True)
    await db.users.create_index("role", background=True)
    print("    ✅ 3 índices creados")
    
    # ============ ORGANIZATIONS COLLECTION ============
    print("  🏢 Colección: organizations")
    await db.organizations.create_index("id", unique=True, background=True)
    await db.organizations.create_index("name", background=True)
    print("    ✅ 2 índices creados")
    
    # ============ GROUPS COLLECTION ============
    print("  📁 Colección: groups")
    await db.groups.create_index("id", unique=True, background=True)
    await db.groups.create_index("organization_id", background=True)
    await db.groups.create_index("name", background=True)
    print("    ✅ 3 índices creados")
    
    # ============ STATUS HISTORY COLLECTION ============
    print("  📊 Colección: status_history")
    await db.status_history.create_index("device_id", background=True)
    await db.status_history.create_index([("device_id", 1), ("timestamp", -1)], background=True)  # Compound for history queries
    print("    ✅ 2 índices creados")
    
    # ============ ALERTS COLLECTION ============
    print("  🔔 Colección: alerts")
    await db.alerts.create_index("id", unique=True, background=True)
    await db.alerts.create_index("device_id", background=True)
    await db.alerts.create_index([("timestamp", -1)], background=True)  # For sorting
    print("    ✅ 3 índices creados")
    
    # ============ ACCESS LOGS COLLECTION ============
    print("  📝 Colección: access_logs")
    await db.access_logs.create_index("user_id", background=True)
    await db.access_logs.create_index("action", background=True)
    await db.access_logs.create_index("created_at", background=True)
    await db.access_logs.create_index([("created_at", -1)], background=True)
    await db.access_logs.create_index("ip_address", background=True)
    # TTL index to auto-delete old logs (keep 90 days)
    await db.access_logs.create_index("created_at", expireAfterSeconds=90*24*60*60, background=True, name="ttl_90days")
    print("    ✅ 6 índices creados (incluyendo TTL de 90 días)")
    
    # ============ SECURITY EVENTS COLLECTION ============
    print("  🛡️ Colección: security_events")
    await db.security_events.create_index("ip_address", background=True)
    await db.security_events.create_index("event_type", background=True)
    await db.security_events.create_index("created_at", background=True)
    await db.security_events.create_index([("created_at", -1)], background=True)
    # TTL index (keep 30 days)
    await db.security_events.create_index("created_at", expireAfterSeconds=30*24*60*60, background=True, name="ttl_30days")
    print("    ✅ 5 índices creados (incluyendo TTL de 30 días)")
    
    # ============ INCIDENTS COLLECTION ============
    print("  🎫 Colección: incidents")
    await db.incidents.create_index("id", unique=True, background=True)
    await db.incidents.create_index("status", background=True)
    await db.incidents.create_index("priority", background=True)
    await db.incidents.create_index("created_at", background=True)
    await db.incidents.create_index([("status", 1), ("priority", 1)], background=True)
    print("    ✅ 5 índices creados")
    
    # ============ DEVICE TYPES COLLECTION ============
    print("  🏷️ Colección: device_types")
    await db.device_types.create_index("id", unique=True, background=True)
    print("    ✅ 1 índice creado")
    
    # ============ SETTINGS COLLECTION ============
    print("  ⚙️ Colección: settings")
    # Settings usually has only one document, no index needed
    print("    ⏭️ Sin índices necesarios (documento único)")
    
    # ============ BLOCKED IPS COLLECTION ============
    print("  🚫 Colección: blocked_ips")
    await db.blocked_ips.create_index("ip", unique=True, background=True)
    await db.blocked_ips.create_index("blocked_until", background=True)
    print("    ✅ 2 índices creados")
    
    # ============ IP BLACKLIST COLLECTION ============
    print("  ⛔ Colección: ip_blacklist")
    await db.ip_blacklist.create_index("ip", unique=True, background=True)
    print("    ✅ 1 índice creado")
    
    print("\n✅ OPTIMIZACIÓN COMPLETADA")
    print("   Total: 44 índices creados")
    print("   Los índices TTL limpiarán automáticamente datos antiguos")
    
    # Show collection stats
    print("\n📊 Estadísticas de colecciones:")
    collections = ["devices", "users", "organizations", "groups", "status_history", "alerts", "access_logs", "incidents"]
    for coll_name in collections:
        count = await db[coll_name].count_documents({})
        print(f"   {coll_name}: {count} documentos")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
