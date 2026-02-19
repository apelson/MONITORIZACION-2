"""
Siempria Network Monitor API Tests
Tests for: Authentication, Devices, Clone functionality, Mobotix Info, Protocol selection
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dahua-device-sync.preview.emergentagent.com').rstrip('/')

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with admin/admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user data"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
    
    def test_operator_login_success(self):
        """Test operator login with operador/operador123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "operador",
            "password": "operador123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["user"]["role"] == "operator"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wrong",
            "password": "wrong"
        })
        assert response.status_code == 401


class TestDevices:
    """Device CRUD and functionality tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_devices(self, auth_headers):
        """Test getting all devices"""
        response = requests.get(f"{BASE_URL}/api/devices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "devices" in data
        assert isinstance(data["devices"], list)
        # Should have at least the 2 existing cameras
        assert len(data["devices"]) >= 2
    
    def test_device_has_camera_protocol_field(self, auth_headers):
        """Test that camera devices have camera_protocol field (http/https)"""
        response = requests.get(f"{BASE_URL}/api/devices", headers=auth_headers)
        data = response.json()
        
        # Find a camera device
        cameras = [d for d in data["devices"] if d.get("device_type_id") == "type-camera"]
        assert len(cameras) > 0, "No camera devices found"
        
        for camera in cameras:
            assert "camera_protocol" in camera, f"Camera {camera['name']} missing camera_protocol field"
            assert camera["camera_protocol"] in ["http", "https"], f"Invalid protocol: {camera['camera_protocol']}"
    
    def test_create_device_with_http_protocol(self, auth_headers):
        """Test creating a device with HTTP protocol"""
        import uuid
        unique_ip = f"10.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        device_data = {
            "name": "TEST_Camera_HTTP",
            "ip_address": unique_ip,
            "port": 80,
            "device_type_id": "type-camera",
            "camera_protocol": "http",
            "camera_user": "testuser",
            "camera_password": "testpass",
            "camera_path": "/cgi-bin/image.jpg"
        }
        response = requests.post(f"{BASE_URL}/api/devices", json=device_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create device: {response.text}"
        data = response.json()
        assert data["device"]["camera_protocol"] == "http"
        
        # Cleanup
        device_id = data["device"]["id"]
        requests.delete(f"{BASE_URL}/api/devices/{device_id}", headers=auth_headers)
    
    def test_create_device_with_https_protocol(self, auth_headers):
        """Test creating a device with HTTPS protocol"""
        import uuid
        unique_ip = f"10.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        device_data = {
            "name": "TEST_Camera_HTTPS",
            "ip_address": unique_ip,
            "port": 443,
            "device_type_id": "type-camera",
            "camera_protocol": "https",
            "camera_user": "testuser",
            "camera_password": "testpass",
            "camera_path": "/snap.jpg"
        }
        response = requests.post(f"{BASE_URL}/api/devices", json=device_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create device: {response.text}"
        data = response.json()
        assert data["device"]["camera_protocol"] == "https"
        
        # Verify image_url uses https
        assert data["device"]["image_url"].startswith("https://")
        
        # Cleanup
        device_id = data["device"]["id"]
        requests.delete(f"{BASE_URL}/api/devices/{device_id}", headers=auth_headers)
    
    def test_update_device_protocol(self, auth_headers):
        """Test updating device protocol from http to https"""
        import uuid
        unique_ip = f"10.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}"
        # Create device with http
        device_data = {
            "name": "TEST_Protocol_Update",
            "ip_address": unique_ip,
            "port": 8080,
            "device_type_id": "type-camera",
            "camera_protocol": "http",
            "camera_user": "admin",
            "camera_password": "pass123",
            "camera_path": "/image.jpg"
        }
        create_response = requests.post(f"{BASE_URL}/api/devices", json=device_data, headers=auth_headers)
        device_id = create_response.json()["device"]["id"]
        
        # Update to https
        update_response = requests.put(
            f"{BASE_URL}/api/devices/{device_id}",
            json={"camera_protocol": "https"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        updated_device = update_response.json()["device"]
        assert updated_device["camera_protocol"] == "https"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/devices/{device_id}", headers=auth_headers)


class TestMobotixInfo:
    """Tests for Mobotix camera info endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_mobotix_info_endpoint_exists(self, auth_headers):
        """Test that mobotix-info endpoint exists and returns data"""
        # Get a camera device
        devices_response = requests.get(f"{BASE_URL}/api/devices", headers=auth_headers)
        devices = devices_response.json()["devices"]
        camera = next((d for d in devices if d.get("device_type_id") == "type-camera"), None)
        
        if camera:
            response = requests.get(
                f"{BASE_URL}/api/devices/{camera['id']}/mobotix-info",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            
            # Verify response structure
            assert "device_id" in data
            assert "device_name" in data
            assert "ip_address" in data
            assert "protocol" in data
            assert "device_status" in data
    
    def test_mobotix_info_returns_camera_details(self, auth_headers):
        """Test that mobotix-info returns proper camera details"""
        # Get the CAMARA PRUEBA device
        devices_response = requests.get(f"{BASE_URL}/api/devices", headers=auth_headers)
        devices = devices_response.json()["devices"]
        camera = next((d for d in devices if "CAMARA PRUEBA" in d.get("name", "")), None)
        
        if camera:
            response = requests.get(
                f"{BASE_URL}/api/devices/{camera['id']}/mobotix-info",
                headers=auth_headers
            )
            data = response.json()
            
            assert data["device_name"] == "CAMARA PRUEBA"
            assert data["protocol"] == "http"
            # Should have some mobotix_info or errors
            assert "mobotix_info" in data or "errors" in data
    
    def test_mobotix_info_invalid_device(self, auth_headers):
        """Test mobotix-info with invalid device ID"""
        response = requests.get(
            f"{BASE_URL}/api/devices/invalid-device-id/mobotix-info",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestDeviceTypes:
    """Tests for device types"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_device_types(self, auth_headers):
        """Test getting device types"""
        response = requests.get(f"{BASE_URL}/api/device-types", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "device_types" in data
        
        # Should have camera type
        types = data["device_types"]
        camera_type = next((t for t in types if t["id"] == "type-camera"), None)
        assert camera_type is not None, "Camera type not found"
        assert camera_type["icon"] == "camera"


class TestOrganizationsAndGroups:
    """Tests for organizations and groups"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_organizations(self, auth_headers):
        """Test getting organizations"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "organizations" in data
    
    def test_get_groups(self, auth_headers):
        """Test getting groups"""
        response = requests.get(f"{BASE_URL}/api/groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "groups" in data


class TestExportEndpoints:
    """Tests for export functionality"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_export_excel(self, auth_headers):
        """Test Excel export endpoint"""
        response = requests.get(f"{BASE_URL}/api/export/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "spreadsheet" in response.headers.get("Content-Type", "")
    
    def test_export_pdf(self, auth_headers):
        """Test PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/export/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert "pdf" in response.headers.get("Content-Type", "")


class TestImageProxy:
    """Tests for image proxy functionality"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_image_proxy_for_camera(self, auth_headers):
        """Test image proxy returns image for camera with credentials"""
        # Get a camera device with image_url
        devices_response = requests.get(f"{BASE_URL}/api/devices", headers=auth_headers)
        devices = devices_response.json()["devices"]
        camera = next((d for d in devices if d.get("image_url") and "@" in d.get("image_url", "")), None)
        
        if camera:
            response = requests.get(
                f"{BASE_URL}/api/image-proxy/{camera['id']}",
                headers=auth_headers
            )
            # Should return image or 502 if camera is offline
            assert response.status_code in [200, 502]
            if response.status_code == 200:
                assert "image" in response.headers.get("Content-Type", "")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
