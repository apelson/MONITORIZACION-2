"""
Siempria Conteo API Tests
Tests for:
- Auth: Login with admin/Conteo2024!
- Users CRUD: POST/GET/PUT/DELETE /api/users
- Cameras CRUD: POST/GET/PUT/DELETE /api/cameras
- Ranking: GET /api/ranking/realtime, by-brand, by-center, by-island
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://conteo-preview.preview.emergentagent.com').rstrip('/')
TEST_PREFIX = f"TEST_{uuid.uuid4().hex[:6]}_"


class TestAuth:
    """Auth endpoint tests - Login with admin/Conteo2024!"""

    def test_login_success(self):
        """Login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        assert len(data["token"]) > 20, "Token should be a valid JWT"

    def test_login_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_login_missing_fields(self):
        """Login with missing fields should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "Conteo2024!"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestRankingAPI:
    """Ranking API tests - all ranking endpoints"""

    def test_ranking_realtime(self, auth_headers):
        """GET /api/ranking/realtime - should return ranking data structure"""
        response = requests.get(f"{BASE_URL}/api/ranking/realtime", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ranking" in data, "Response should contain 'ranking'"
        assert "totals" in data, "Response should contain 'totals'"
        assert "cameras_total" in data, "Response should contain 'cameras_total'"
        assert "cameras_online" in data, "Response should contain 'cameras_online'"
        assert isinstance(data["ranking"], list)
        # Totals should have entries (not exits displayed in UI)
        assert "entries" in data["totals"], "Totals should have 'entries'"
        
    def test_ranking_by_brand(self, auth_headers):
        """GET /api/ranking/by-brand - should return brand ranking"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-brand", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ranking" in data
        assert "period" in data
        assert isinstance(data["ranking"], list)
        # Each brand should have required fields
        for brand in data["ranking"]:
            assert "brand_id" in brand
            assert "brand_name" in brand
            assert "total_visits" in brand

    def test_ranking_by_center(self, auth_headers):
        """GET /api/ranking/by-center - should return center ranking"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-center", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ranking" in data
        assert "period" in data
        assert isinstance(data["ranking"], list)

    def test_ranking_by_island(self, auth_headers):
        """GET /api/ranking/by-island - should return island statistics"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-island", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "islands" in data
        assert isinstance(data["islands"], dict)

    def test_ranking_requires_auth(self):
        """Ranking endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/ranking/realtime")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestCamerasAPI:
    """Camera CRUD API tests"""

    def test_get_cameras(self, auth_headers):
        """GET /api/cameras - should return cameras list"""
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "cameras" in data
        assert "total" in data
        assert isinstance(data["cameras"], list)
        assert isinstance(data["total"], int)

    def test_camera_crud_flow(self, auth_headers):
        """Test complete camera CRUD: create, read, update, delete"""
        camera_id = f"{TEST_PREFIX}camera_001"
        
        # CREATE camera
        create_payload = {
            "camera_id": camera_id,
            "camera_name": "Test Camera",
            "brand_id": "audi",
            "island": "tenerife",
            "ip": "192.168.1.100",
            "port": 443,
            "username": "testuser",
            "password": "testpass",
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/cameras", json=create_payload, headers=auth_headers)
        assert response.status_code == 200, f"CREATE failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        assert camera_id in data.get("camera_id", "")
        
        # READ to verify camera was created
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        assert response.status_code == 200
        cameras = response.json()["cameras"]
        camera_found = any(c["camera_id"] == camera_id for c in cameras)
        assert camera_found, f"Camera {camera_id} not found after creation"
        
        # UPDATE camera
        update_payload = {
            "camera_name": "Updated Test Camera",
            "enabled": False
        }
        response = requests.put(f"{BASE_URL}/api/cameras/{camera_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"UPDATE failed: {response.status_code} - {response.text}"
        
        # VERIFY update
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras = response.json()["cameras"]
        updated_camera = next((c for c in cameras if c["camera_id"] == camera_id), None)
        assert updated_camera is not None
        assert updated_camera["camera_name"] == "Updated Test Camera"
        
        # DELETE camera
        response = requests.delete(f"{BASE_URL}/api/cameras/{camera_id}", headers=auth_headers)
        assert response.status_code == 200, f"DELETE failed: {response.status_code} - {response.text}"
        
        # VERIFY deletion
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        cameras = response.json()["cameras"]
        camera_exists = any(c["camera_id"] == camera_id for c in cameras)
        assert not camera_exists, f"Camera {camera_id} still exists after deletion"

    def test_delete_nonexistent_camera(self, auth_headers):
        """DELETE nonexistent camera should return 404"""
        response = requests.delete(f"{BASE_URL}/api/cameras/nonexistent-camera-999", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_cameras_requires_auth(self):
        """Cameras endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/cameras")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestUsersAPI:
    """User CRUD API tests - admin only"""

    def test_get_users(self, auth_headers):
        """GET /api/users - should return users list (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        # Should have at least admin user
        admin_user = next((u for u in data["users"] if u["username"] == "admin"), None)
        assert admin_user is not None, "Admin user should exist"
        assert admin_user["role"] == "admin"

    def test_user_crud_flow(self, auth_headers):
        """Test complete user CRUD: create, read, update, delete"""
        test_username = f"{TEST_PREFIX}user"
        
        # CREATE user
        create_payload = {
            "username": test_username,
            "password": "testpassword123",
            "role": "viewer",
            "full_name": "Test User"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=create_payload, headers=auth_headers)
        assert response.status_code == 200, f"CREATE failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data
        
        # READ to verify user was created and get user ID
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()["users"]
        created_user = next((u for u in users if u["username"] == test_username), None)
        assert created_user is not None, f"User {test_username} not found after creation"
        assert created_user["role"] == "viewer"
        assert created_user["full_name"] == "Test User"
        user_id = created_user["id"]
        
        # UPDATE user
        update_payload = {
            "full_name": "Updated Test User",
            "role": "operator"
        }
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200, f"UPDATE failed: {response.status_code} - {response.text}"
        
        # VERIFY update
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = response.json()["users"]
        updated_user = next((u for u in users if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user["full_name"] == "Updated Test User"
        assert updated_user["role"] == "operator"
        
        # Toggle active status
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json={"is_active": False}, headers=auth_headers)
        assert response.status_code == 200
        
        # DELETE user
        response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers)
        assert response.status_code == 200, f"DELETE failed: {response.status_code} - {response.text}"
        
        # VERIFY deletion
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = response.json()["users"]
        user_exists = any(u.get("id") == user_id for u in users)
        assert not user_exists, f"User {user_id} still exists after deletion"

    def test_delete_nonexistent_user(self, auth_headers):
        """DELETE nonexistent user should return 404"""
        response = requests.delete(f"{BASE_URL}/api/users/nonexistent-user-999", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_create_duplicate_user(self, auth_headers):
        """Creating duplicate user should fail"""
        response = requests.post(f"{BASE_URL}/api/users", json={
            "username": "admin",  # Already exists
            "password": "test123",
            "role": "viewer"
        }, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"

    def test_users_requires_auth(self):
        """Users endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestHealthAPI:
    """Health check API tests"""
    
    def test_health_check(self):
        """GET /api/health - should return service status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "siempria-conteo"


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup any leftover test data after all tests complete"""
    yield
    # Cleanup could be added here if needed
    print(f"Test run complete. Test prefix was: {TEST_PREFIX}")
