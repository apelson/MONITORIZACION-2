"""
Dahua P2P API Tests
Tests for Dahua DVR/NVR device management via P2P connection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://noc-dashboard-fix-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USERNAME = "admin"
TEST_PASSWORD = "Spw@16071977"

# Test device data
TEST_DEVICE_DATA = {
    "name": "TEST_Dahua_DVR_001",
    "serial_number": "TEST123456789012",
    "username": "admin",
    "password": "TestPass123"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestDahuaDevicesCRUD:
    """Test CRUD operations for Dahua devices"""
    
    created_device_id = None
    
    def test_01_list_dahua_devices(self, auth_headers):
        """Test GET /api/dahua/devices - List all Dahua devices"""
        response = requests.get(f"{BASE_URL}/api/dahua/devices", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "devices" in data, "Response should contain 'devices' key"
        assert "count" in data, "Response should contain 'count' key"
        assert isinstance(data["devices"], list), "devices should be a list"
        assert data["count"] == len(data["devices"]), "count should match devices length"
        print(f"SUCCESS: Found {data['count']} Dahua devices")
    
    def test_02_create_dahua_device(self, auth_headers):
        """Test POST /api/dahua/devices - Create new Dahua device"""
        response = requests.post(
            f"{BASE_URL}/api/dahua/devices",
            headers=auth_headers,
            json=TEST_DEVICE_DATA
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "device" in data, "Response should contain 'device' key"
        assert data["device"]["name"] == TEST_DEVICE_DATA["name"], "Device name should match"
        assert data["device"]["serial_number"] == TEST_DEVICE_DATA["serial_number"], "Serial should match"
        assert data["device"]["password"] == "********", "Password should be masked"
        assert "id" in data["device"], "Device should have an ID"
        
        TestDahuaDevicesCRUD.created_device_id = data["device"]["id"]
        print(f"SUCCESS: Created Dahua device with ID: {TestDahuaDevicesCRUD.created_device_id}")
    
    def test_03_get_single_dahua_device(self, auth_headers):
        """Test GET /api/dahua/devices/{device_id} - Get single device"""
        if not TestDahuaDevicesCRUD.created_device_id:
            pytest.skip("No device created to fetch")
        
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices/{TestDahuaDevicesCRUD.created_device_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == TEST_DEVICE_DATA["name"], "Device name should match"
        assert data["serial_number"] == TEST_DEVICE_DATA["serial_number"], "Serial should match"
        assert data["password"] == "********", "Password should be masked"
        print(f"SUCCESS: Retrieved device {data['name']}")
    
    def test_04_update_dahua_device(self, auth_headers):
        """Test PUT /api/dahua/devices/{device_id} - Update device"""
        if not TestDahuaDevicesCRUD.created_device_id:
            pytest.skip("No device created to update")
        
        update_data = {"name": "TEST_Dahua_DVR_Updated"}
        
        response = requests.put(
            f"{BASE_URL}/api/dahua/devices/{TestDahuaDevicesCRUD.created_device_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "device" in data, "Response should contain 'device' key"
        assert data["device"]["name"] == update_data["name"], "Name should be updated"
        print(f"SUCCESS: Updated device name to {data['device']['name']}")
    
    def test_05_verify_update_persisted(self, auth_headers):
        """Verify the update was persisted in database"""
        if not TestDahuaDevicesCRUD.created_device_id:
            pytest.skip("No device created to verify")
        
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices/{TestDahuaDevicesCRUD.created_device_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Dahua_DVR_Updated", "Updated name should persist"
        print("SUCCESS: Update verified in database")
    
    def test_06_delete_dahua_device(self, auth_headers):
        """Test DELETE /api/dahua/devices/{device_id} - Delete device"""
        if not TestDahuaDevicesCRUD.created_device_id:
            pytest.skip("No device created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/dahua/devices/{TestDahuaDevicesCRUD.created_device_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"SUCCESS: Deleted device {TestDahuaDevicesCRUD.created_device_id}")
    
    def test_07_verify_delete(self, auth_headers):
        """Verify the device was deleted from database"""
        if not TestDahuaDevicesCRUD.created_device_id:
            pytest.skip("No device created to verify deletion")
        
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices/{TestDahuaDevicesCRUD.created_device_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for deleted device, got {response.status_code}"
        print("SUCCESS: Device deletion verified - returns 404")


class TestDahuaStatusEndpoints:
    """Test Dahua status and summary endpoints"""
    
    def test_status_summary(self, auth_headers):
        """Test GET /api/dahua/status - Get status summary"""
        response = requests.get(f"{BASE_URL}/api/dahua/status", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary' key"
        
        summary = data["summary"]
        assert "total" in summary, "Summary should contain 'total'"
        assert "online" in summary, "Summary should contain 'online'"
        assert "offline" in summary, "Summary should contain 'offline'"
        
        print(f"SUCCESS: Status summary - Total: {summary['total']}, Online: {summary['online']}, Offline: {summary['offline']}")


class TestDahuaQuickCheck:
    """Test Dahua quick check serial number endpoint"""
    
    def test_quick_check_invalid_serial(self, auth_headers):
        """Test POST /api/dahua/quick-check/{serial} - Check invalid serial"""
        test_serial = "TESTSERIAL123456"
        
        response = requests.post(
            f"{BASE_URL}/api/dahua/quick-check/{test_serial}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "serial_number" in data, "Response should contain 'serial_number'"
        assert data["serial_number"] == test_serial, "Serial number should match request"
        assert "cloud_registered" in data, "Response should contain 'cloud_registered'"
        assert "p2p_available" in data, "Response should contain 'p2p_available'"
        
        # Invalid serial should not be registered
        print(f"SUCCESS: Quick check completed - registered: {data['cloud_registered']}, available: {data['p2p_available']}")
    
    def test_quick_check_response_structure(self, auth_headers):
        """Verify quick check response has correct structure"""
        test_serial = "4M0A1B2C3D4E5F6G"
        
        response = requests.post(
            f"{BASE_URL}/api/dahua/quick-check/{test_serial}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_keys = ["serial_number", "cloud_registered", "p2p_available"]
        for key in expected_keys:
            assert key in data, f"Response should contain '{key}'"
        
        print(f"SUCCESS: Quick check response structure verified")


class TestDahuaErrorHandling:
    """Test Dahua API error handling"""
    
    def test_get_nonexistent_device(self, auth_headers):
        """Test GET /api/dahua/devices/{id} with invalid ID"""
        fake_id = "nonexistent-device-id-12345"
        
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Nonexistent device returns 404")
    
    def test_update_nonexistent_device(self, auth_headers):
        """Test PUT /api/dahua/devices/{id} with invalid ID"""
        fake_id = "nonexistent-device-id-12345"
        
        response = requests.put(
            f"{BASE_URL}/api/dahua/devices/{fake_id}",
            headers=auth_headers,
            json={"name": "Test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Update nonexistent device returns 404")
    
    def test_delete_nonexistent_device(self, auth_headers):
        """Test DELETE /api/dahua/devices/{id} with invalid ID"""
        fake_id = "nonexistent-device-id-12345"
        
        response = requests.delete(
            f"{BASE_URL}/api/dahua/devices/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Delete nonexistent device returns 404")
    
    def test_unauthorized_access(self):
        """Test API returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/dahua/devices")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Unauthorized request returns 401/403")


class TestDahuaValidation:
    """Test input validation for Dahua devices"""
    
    def test_create_device_missing_required_fields(self, auth_headers):
        """Test POST /api/dahua/devices with missing required fields"""
        incomplete_data = {"name": "Test Device"}  # Missing serial_number and password
        
        response = requests.post(
            f"{BASE_URL}/api/dahua/devices",
            headers=auth_headers,
            json=incomplete_data
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print("SUCCESS: Missing fields returns 422 validation error")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
