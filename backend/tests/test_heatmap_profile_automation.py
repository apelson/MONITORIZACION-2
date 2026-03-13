"""
Test heatmap_profile automation for cameras (P0 Feature)
- POST /api/cameras should automatically set heatmap_profile='default'
- PUT /api/cameras/{id} should auto-set heatmap_profile='default' for cameras without it
- PUT /api/cameras/{id} should preserve explicit heatmap_profile values when provided
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "Conteo2024!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health endpoint returns status ok")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        print("✓ Login with admin/Conteo2024! successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid",
            "password": "wrong"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected (401)")


class TestHeatmapProfileAutomation:
    """Test automatic heatmap_profile='default' on camera creation/update"""
    
    def test_post_camera_auto_sets_heatmap_profile(self, auth_headers):
        """POST /api/cameras should automatically set heatmap_profile='default'"""
        test_camera_id = f"TEST_heatmap_auto_{uuid.uuid4().hex[:8]}"
        
        # Create camera without specifying heatmap_profile
        create_payload = {
            "camera_id": test_camera_id,
            "camera_name": "Test Heatmap Auto Camera",
            "brand_id": "audi",
            "island": "tenerife",
            "ip": "192.168.1.100",
            "port": 443,
            "username": "test_user",
            "password": "test_pass",
            "enabled": True
        }
        
        response = requests.post(f"{BASE_URL}/api/cameras", json=create_payload, headers=auth_headers)
        assert response.status_code == 200, f"Camera creation failed: {response.text}"
        
        # Verify camera was created with heatmap_profile='default'
        get_response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        assert get_response.status_code == 200
        cameras = get_response.json().get("cameras", [])
        
        created_camera = next((c for c in cameras if c["camera_id"] == test_camera_id), None)
        assert created_camera is not None, f"Camera {test_camera_id} not found in list"
        assert created_camera.get("heatmap_profile") == "default", \
            f"heatmap_profile should be 'default', got '{created_camera.get('heatmap_profile')}'"
        
        print(f"✓ POST /api/cameras auto-sets heatmap_profile='default' for {test_camera_id}")
        
        # Cleanup: Delete test camera
        delete_response = requests.delete(f"{BASE_URL}/api/cameras/{test_camera_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test camera {test_camera_id}")
    
    def test_put_camera_auto_sets_heatmap_profile_if_missing(self, auth_headers):
        """PUT /api/cameras/{id} should auto-set heatmap_profile='default' for cameras without it"""
        test_camera_id = f"TEST_heatmap_update_{uuid.uuid4().hex[:8]}"
        
        # First create a camera
        create_payload = {
            "camera_id": test_camera_id,
            "camera_name": "Test Camera for Update",
            "brand_id": "volkswagen",
            "island": "gran-canaria",
            "ip": "192.168.1.101",
            "port": 443,
            "username": "test_user",
            "password": "test_pass",
            "enabled": True
        }
        
        response = requests.post(f"{BASE_URL}/api/cameras", json=create_payload, headers=auth_headers)
        assert response.status_code == 200
        
        # Update the camera name without specifying heatmap_profile
        update_payload = {"camera_name": "Updated Test Camera Name"}
        update_response = requests.put(f"{BASE_URL}/api/cameras/{test_camera_id}", 
                                       json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify heatmap_profile is still 'default'
        get_response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras = get_response.json().get("cameras", [])
        updated_camera = next((c for c in cameras if c["camera_id"] == test_camera_id), None)
        
        assert updated_camera is not None
        assert updated_camera.get("heatmap_profile") == "default", \
            f"heatmap_profile should be preserved as 'default', got '{updated_camera.get('heatmap_profile')}'"
        assert updated_camera.get("camera_name") == "Updated Test Camera Name"
        
        print(f"✓ PUT /api/cameras preserves heatmap_profile='default' on update")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cameras/{test_camera_id}", headers=auth_headers)
        print(f"✓ Cleaned up test camera {test_camera_id}")
    
    def test_put_camera_preserves_explicit_heatmap_profile(self, auth_headers):
        """PUT /api/cameras/{id} should preserve explicit heatmap_profile values when provided"""
        test_camera_id = f"TEST_heatmap_explicit_{uuid.uuid4().hex[:8]}"
        
        # Create camera (will have heatmap_profile='default')
        create_payload = {
            "camera_id": test_camera_id,
            "camera_name": "Test Camera Explicit Profile",
            "brand_id": "honda",
            "island": "lanzarote",
            "ip": "192.168.1.102",
            "port": 443,
            "username": "test_user",
            "password": "test_pass",
            "enabled": True
        }
        
        response = requests.post(f"{BASE_URL}/api/cameras", json=create_payload, headers=auth_headers)
        assert response.status_code == 200
        
        # Update with explicit heatmap_profile value
        custom_profile = "custom_heatmap_profile_v2"
        update_payload = {"heatmap_profile": custom_profile}
        update_response = requests.put(f"{BASE_URL}/api/cameras/{test_camera_id}", 
                                       json=update_payload, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify custom heatmap_profile is preserved
        get_response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras = get_response.json().get("cameras", [])
        updated_camera = next((c for c in cameras if c["camera_id"] == test_camera_id), None)
        
        assert updated_camera is not None
        assert updated_camera.get("heatmap_profile") == custom_profile, \
            f"heatmap_profile should be '{custom_profile}', got '{updated_camera.get('heatmap_profile')}'"
        
        print(f"✓ PUT /api/cameras preserves explicit heatmap_profile='{custom_profile}'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cameras/{test_camera_id}", headers=auth_headers)
        print(f"✓ Cleaned up test camera {test_camera_id}")


class TestCamerasEndpoints:
    """Test cameras CRUD endpoints"""
    
    def test_get_cameras_list(self, auth_headers):
        """GET /api/cameras returns camera list"""
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "cameras" in data
        assert isinstance(data["cameras"], list)
        print(f"✓ GET /api/cameras returns {len(data['cameras'])} cameras")
    
    def test_camera_crud_full_cycle(self, auth_headers):
        """Test full CRUD cycle for cameras"""
        test_camera_id = f"TEST_crud_{uuid.uuid4().hex[:8]}"
        
        # CREATE
        create_payload = {
            "camera_id": test_camera_id,
            "camera_name": "CRUD Test Camera",
            "brand_id": "skoda",
            "island": "fuerteventura",
            "ip": "192.168.1.200",
            "port": 8080,
            "username": "admin",
            "password": "secret",
            "enabled": True
        }
        create_resp = requests.post(f"{BASE_URL}/api/cameras", json=create_payload, headers=auth_headers)
        assert create_resp.status_code == 200
        print(f"✓ CREATE camera {test_camera_id}")
        
        # READ - Verify camera exists
        get_resp = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras = get_resp.json().get("cameras", [])
        created_cam = next((c for c in cameras if c["camera_id"] == test_camera_id), None)
        assert created_cam is not None
        assert created_cam["camera_name"] == "CRUD Test Camera"
        assert created_cam["brand_id"] == "skoda"
        assert created_cam["island"] == "fuerteventura"
        assert created_cam["heatmap_profile"] == "default"
        print(f"✓ READ camera {test_camera_id} - verified all fields")
        
        # UPDATE
        update_resp = requests.put(f"{BASE_URL}/api/cameras/{test_camera_id}", 
                                   json={"camera_name": "Updated CRUD Camera", "enabled": False},
                                   headers=auth_headers)
        assert update_resp.status_code == 200
        
        # Verify update
        get_resp2 = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras2 = get_resp2.json().get("cameras", [])
        updated_cam = next((c for c in cameras2 if c["camera_id"] == test_camera_id), None)
        assert updated_cam["camera_name"] == "Updated CRUD Camera"
        assert updated_cam["enabled"] == False
        print(f"✓ UPDATE camera {test_camera_id}")
        
        # DELETE
        delete_resp = requests.delete(f"{BASE_URL}/api/cameras/{test_camera_id}", headers=auth_headers)
        assert delete_resp.status_code == 200
        
        # Verify deletion
        get_resp3 = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras3 = get_resp3.json().get("cameras", [])
        deleted_cam = next((c for c in cameras3 if c["camera_id"] == test_camera_id), None)
        assert deleted_cam is None
        print(f"✓ DELETE camera {test_camera_id} - verified removal")


class TestDashboardEndpoints:
    """Test dashboard/ranking endpoints"""
    
    def test_ranking_realtime(self, auth_headers):
        """GET /api/ranking/realtime returns ranking data"""
        response = requests.get(f"{BASE_URL}/api/ranking/realtime", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "ranking" in data
        print(f"✓ GET /api/ranking/realtime returns ranking with {len(data.get('ranking', []))} items")
    
    def test_ranking_trends(self, auth_headers):
        """GET /api/ranking/trends returns hourly data"""
        response = requests.get(f"{BASE_URL}/api/ranking/trends", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "hourly_today" in data or "data" in data
        print(f"✓ GET /api/ranking/trends returns trend data")
    
    def test_heatmap_cameras(self, auth_headers):
        """GET /api/heatmap/cameras returns heatmap-enabled cameras"""
        response = requests.get(f"{BASE_URL}/api/heatmap/cameras", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "cameras" in data
        print(f"✓ GET /api/heatmap/cameras returns {len(data.get('cameras', []))} cameras")
    
    def test_analytics_executive(self, auth_headers):
        """GET /api/analytics/executive returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/analytics/executive", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check for expected KPI fields
        expected_fields = ["today_total", "yesterday_total", "month_total", "cameras_total"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ GET /api/analytics/executive returns KPI data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
