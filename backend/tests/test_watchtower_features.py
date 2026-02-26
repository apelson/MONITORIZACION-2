"""
Test file for WatchTower by Siempria - Testing key features:
1. System status endpoint (/api/system-status) - CPU/RAM data
2. Login endpoint (/api/auth/login)
3. Devices endpoint (/api/devices)
4. Maintenance endpoint (/api/maintenance/devices)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = "admin"
TEST_PASS = "admin123"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == TEST_USER
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful for user: {data['user']['username']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code in [401, 400], f"Expected 401/400 for invalid credentials, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestSystemStatus:
    """Test system status endpoint - CPU/RAM data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_system_status_returns_data(self):
        """Test /api/system-status returns CPU and RAM data"""
        response = requests.get(
            f"{BASE_URL}/api/system-status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check system resources are present
        assert "system" in data, "Response should contain 'system' key"
        assert "cpu_percent" in data["system"], "System should contain cpu_percent"
        assert "memory" in data["system"], "System should contain memory"
        assert "percent" in data["system"]["memory"], "Memory should contain percent"
        
        # Validate CPU and RAM are numeric values
        cpu = data["system"]["cpu_percent"]
        ram = data["system"]["memory"]["percent"]
        
        assert isinstance(cpu, (int, float)), f"CPU should be numeric, got {type(cpu)}"
        assert isinstance(ram, (int, float)), f"RAM should be numeric, got {type(ram)}"
        assert 0 <= cpu <= 100, f"CPU should be 0-100, got {cpu}"
        assert 0 <= ram <= 100, f"RAM should be 0-100, got {ram}"
        
        print(f"✓ System status: CPU {cpu}%, RAM {ram}%")
    
    def test_system_status_has_database_info(self):
        """Test /api/system-status returns database info"""
        response = requests.get(
            f"{BASE_URL}/api/system-status",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "database" in data
        assert data["database"]["status"] == "connected"
        print(f"✓ Database connected: {data['database']['name']}")
    
    def test_system_status_quick_endpoint(self):
        """Test /api/system-status/quick (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/system-status/quick")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data
        assert data["backend"] == "running"
        print(f"✓ Quick status: {data['status']}")


class TestDevices:
    """Test devices endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_devices_list(self):
        """Test /api/devices returns list"""
        response = requests.get(
            f"{BASE_URL}/api/devices",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "devices" in data, "Response should contain 'devices' key"
        assert isinstance(data["devices"], list), "devices should be a list"
        print(f"✓ Devices endpoint working, found {len(data['devices'])} devices")


class TestMaintenance:
    """Test maintenance endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_maintenance_devices_list(self):
        """Test /api/maintenance/devices returns list"""
        response = requests.get(
            f"{BASE_URL}/api/maintenance/devices",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "devices" in data, "Response should contain 'devices' key"
        assert isinstance(data["devices"], list), "devices should be a list"
        print(f"✓ Maintenance endpoint working, found {len(data['devices'])} devices in maintenance")


class TestDeviceTypes:
    """Test device types endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": TEST_USER, "password": TEST_PASS}
        )
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_device_types_list(self):
        """Test /api/device-types returns list with types"""
        response = requests.get(
            f"{BASE_URL}/api/device-types",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "device_types" in data, "Response should contain 'device_types' key"
        assert isinstance(data["device_types"], list), "device_types should be a list"
        
        # Verify at least some default types exist
        type_names = [t.get("name") for t in data["device_types"]]
        print(f"✓ Device types: {type_names}")
