"""
Siempria NOC Dashboard Backend API Tests
Tests for: Auth, Devices, Organizations, Groups, Alerts, CRA, WebSocket
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment - DO NOT add default
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fallback for local testing
    BASE_URL = "https://noc-quality-audit.preview.emergentagent.com"

print(f"Testing against: {BASE_URL}")

# Test credentials from previous iteration - admin/admin123
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

# Storage for test-created data
CREATED_IDS = {
    "organizations": [],
    "groups": [],
    "devices": []
}

class TestHealthAndRoot:
    """Health check and root endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Root endpoint failed: {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"✓ API Root: {data['message']}")

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == TEST_USERNAME
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful for user: {data['user']['username']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get me failed: {response.status_code}"
        data = response.json()
        assert "user" in data
        assert data["user"]["username"] == TEST_USERNAME
        print(f"✓ /auth/me returned user: {data['user']['username']}")
    
    def test_get_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401 without token, got: {response.status_code}"
        print("✓ Unauthorized access correctly rejected")


class TestDevices:
    """Device CRUD and management tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        """Get auth token for all tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_devices(self):
        """Test GET /api/devices"""
        response = requests.get(
            f"{BASE_URL}/api/devices",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get devices failed: {response.status_code}"
        data = response.json()
        assert "devices" in data
        print(f"✓ GET /api/devices returned {len(data['devices'])} devices")
    
    def test_get_device_stats(self):
        """Test GET /api/devices/stats"""
        response = requests.get(
            f"{BASE_URL}/api/devices/stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get stats failed: {response.status_code}"
        data = response.json()
        assert "total" in data
        assert "online" in data
        assert "offline" in data
        print(f"✓ Device stats: total={data['total']}, online={data['online']}, offline={data['offline']}")
    
    def test_get_device_types(self):
        """Test GET /api/device-types"""
        response = requests.get(
            f"{BASE_URL}/api/device-types",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get device types failed: {response.status_code}"
        data = response.json()
        assert "device_types" in data
        print(f"✓ GET /api/device-types returned {len(data['device_types'])} types")
    
    def test_create_device_and_verify(self):
        """Test POST /api/devices - create new device"""
        device_data = {
            "name": f"TEST_Device_{uuid.uuid4().hex[:8]}",
            "ip_address": "192.168.99.99",
            "port": 9999,
            "description": "Test device for automated testing",
            "device_type_id": "type-camera"
        }
        
        # Create device
        response = requests.post(
            f"{BASE_URL}/api/devices",
            json=device_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create device failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "device" in data
        assert data["device"]["name"] == device_data["name"]
        assert data["device"]["ip_address"] == device_data["ip_address"]
        device_id = data["device"]["id"]
        CREATED_IDS["devices"].append(device_id)
        print(f"✓ Created device: {data['device']['name']} (ID: {device_id})")
        
        # Verify device was actually created by fetching it
        get_response = requests.get(
            f"{BASE_URL}/api/devices/{device_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"Get created device failed: {get_response.status_code}"
        fetched = get_response.json()
        assert fetched["name"] == device_data["name"]
        print(f"✓ Verified device persisted: {fetched['name']}")
        
        return device_id
    
    def test_update_device(self):
        """Test PUT /api/devices/{id}"""
        # First create a device
        device_id = self.test_create_device_and_verify()
        
        # Update it
        update_data = {"description": "Updated by test"}
        response = requests.put(
            f"{BASE_URL}/api/devices/{device_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Update device failed: {response.status_code}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/devices/{device_id}",
            headers=self.headers
        )
        assert get_response.json()["description"] == "Updated by test"
        print(f"✓ Device updated successfully")
    
    def test_delete_device(self):
        """Test DELETE /api/devices/{id}"""
        # First create a device to delete
        device_data = {
            "name": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
            "ip_address": "192.168.99.98",
            "port": 9998
        }
        create_response = requests.post(
            f"{BASE_URL}/api/devices",
            json=device_data,
            headers=self.headers
        )
        device_id = create_response.json()["device"]["id"]
        
        # Delete device
        response = requests.delete(
            f"{BASE_URL}/api/devices/{device_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Delete device failed: {response.status_code}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/devices/{device_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404, "Device should not exist after deletion"
        print(f"✓ Device deleted successfully")
    
    def test_device_check(self):
        """Test POST /api/devices/{id}/check"""
        # Get first device
        devices_response = requests.get(f"{BASE_URL}/api/devices", headers=self.headers)
        devices = devices_response.json().get("devices", [])
        if not devices:
            pytest.skip("No devices to check")
        
        device_id = devices[0]["id"]
        response = requests.post(
            f"{BASE_URL}/api/devices/{device_id}/check",
            headers=self.headers
        )
        assert response.status_code == 200, f"Device check failed: {response.status_code}"
        print(f"✓ Device check initiated for: {devices[0]['name']}")


class TestOrganizations:
    """Organization CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_organizations(self):
        """Test GET /api/organizations"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get orgs failed: {response.status_code}"
        data = response.json()
        assert "organizations" in data
        print(f"✓ GET /api/organizations returned {len(data['organizations'])} organizations")
    
    def test_create_organization(self):
        """Test POST /api/organizations"""
        org_data = {
            "name": f"TEST_Org_{uuid.uuid4().hex[:8]}",
            "description": "Test organization",
            "color": "#ff5500"
        }
        response = requests.post(
            f"{BASE_URL}/api/organizations",
            json=org_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create org failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "organization" in data
        org_id = data["organization"]["id"]
        CREATED_IDS["organizations"].append(org_id)
        print(f"✓ Created organization: {data['organization']['name']}")
        return org_id


class TestGroups:
    """Group CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_groups(self):
        """Test GET /api/groups"""
        response = requests.get(
            f"{BASE_URL}/api/groups",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get groups failed: {response.status_code}"
        data = response.json()
        assert "groups" in data
        print(f"✓ GET /api/groups returned {len(data['groups'])} groups")


class TestAlerts:
    """Alert system tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_alerts(self):
        """Test GET /api/alerts"""
        response = requests.get(
            f"{BASE_URL}/api/alerts",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get alerts failed: {response.status_code}"
        data = response.json()
        assert "alerts" in data
        print(f"✓ GET /api/alerts returned {len(data['alerts'])} alerts")
    
    def test_get_alert_stats(self):
        """Test GET /api/alerts/stats"""
        response = requests.get(
            f"{BASE_URL}/api/alerts/stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get alert stats failed: {response.status_code}"
        data = response.json()
        assert "today" in data
        assert "month" in data
        print(f"✓ Alert stats: today={data['today']}, month={data['month']}")


class TestCRA:
    """CRA (Central Receptora de Alarmas) tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_cra_status(self):
        """Test GET /api/cra/status"""
        response = requests.get(
            f"{BASE_URL}/api/cra/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get CRA status failed: {response.status_code}"
        data = response.json()
        assert "total_devices" in data
        assert "status" in data
        print(f"✓ CRA status: {data['total_devices']} devices, status={data['status']}")
    
    def test_get_cra_devices(self):
        """Test GET /api/cra/devices"""
        response = requests.get(
            f"{BASE_URL}/api/cra/devices",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get CRA devices failed: {response.status_code}"
        data = response.json()
        assert "devices" in data
        print(f"✓ CRA devices: {len(data['devices'])} devices")


class TestWebSocket:
    """WebSocket status tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_websocket_status(self):
        """Test GET /api/ws/status"""
        response = requests.get(
            f"{BASE_URL}/api/ws/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get WS status failed: {response.status_code}"
        data = response.json()
        assert "status" in data
        print(f"✓ WebSocket status: {data['status']}")


class TestSettings:
    """Settings tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_settings(self):
        """Test GET /api/settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get settings failed: {response.status_code}"
        print("✓ GET /api/settings successful")


class TestUsers:
    """User management tests"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_users(self):
        """Test GET /api/users"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get users failed: {response.status_code}"
        data = response.json()
        assert "users" in data
        print(f"✓ GET /api/users returned {len(data['users'])} users")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cleanup_test_devices(self):
        """Clean up TEST_ prefixed devices"""
        # Get all devices
        response = requests.get(f"{BASE_URL}/api/devices", headers=self.headers)
        if response.status_code == 200:
            devices = response.json().get("devices", [])
            for device in devices:
                if device["name"].startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/devices/{device['id']}",
                        headers=self.headers
                    )
                    if del_response.status_code == 200:
                        print(f"  Cleaned up device: {device['name']}")
        print("✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
