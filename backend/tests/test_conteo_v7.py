"""
Test file for Siempria Conteo v7 features:
- Login/Auth
- Ranking endpoints (realtime, trends, by-brand, by-center, by-island)
- Camera and User management
- Tendencias/Trends endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://conteo-preview-2.preview.emergentagent.com")

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "siempria-conteo" in data.get("service", "")
        print("PASS: Health endpoint returns ok")
    
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
        assert data["user"]["role"] == "admin"
        print("PASS: Login with admin/Conteo2024! works")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected")


class TestRankingEndpoints:
    """Tests for ranking API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_ranking_realtime(self):
        """Test /api/ranking/realtime endpoint"""
        response = requests.get(f"{BASE_URL}/api/ranking/realtime", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "ranking" in data
        assert "totals" in data
        assert "cameras_total" in data
        assert "cameras_online" in data
        assert "last_update" in data
        print(f"PASS: Realtime ranking returns {len(data['ranking'])} brands, {data['totals']['entries']} visits")
    
    def test_ranking_trends(self):
        """Test /api/ranking/trends endpoint (v7 Tendencias feature)"""
        response = requests.get(f"{BASE_URL}/api/ranking/trends", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Check required fields for trends view
        assert "hourly_today" in data, "hourly_today field missing"
        assert "daily_week" in data, "daily_week field missing"
        assert "brand_hourly" in data, "brand_hourly field missing"
        assert isinstance(data["hourly_today"], list), "hourly_today should be a list"
        assert isinstance(data["daily_week"], list), "daily_week should be a list"
        assert isinstance(data["brand_hourly"], dict), "brand_hourly should be a dict"
        print(f"PASS: Trends endpoint returns hourly_today={len(data['hourly_today'])}, daily_week={len(data['daily_week'])}")
    
    def test_ranking_by_brand(self):
        """Test /api/ranking/by-brand endpoint"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-brand?period=day", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "ranking" in data
        assert "period" in data
        print(f"PASS: By-brand ranking returns {len(data['ranking'])} brands")
    
    def test_ranking_by_center(self):
        """Test /api/ranking/by-center endpoint"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-center?period=day", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "ranking" in data
        assert "period" in data
        print(f"PASS: By-center ranking returns {len(data['ranking'])} centers")
    
    def test_ranking_by_island(self):
        """Test /api/ranking/by-island endpoint"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-island", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "islands" in data
        islands = data["islands"]
        print(f"PASS: By-island returns {len(islands)} islands")


class TestCameraManagement:
    """Tests for camera management API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_cameras(self):
        """Test listing cameras"""
        response = requests.get(f"{BASE_URL}/api/cameras", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "cameras" in data
        print(f"PASS: Cameras list returns {len(data['cameras'])} cameras")


class TestUserManagement:
    """Tests for user management API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_users(self):
        """Test listing users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"PASS: Users list returns {len(data['users'])} users")
    
    def test_create_user_with_permissions(self):
        """Test creating a user with allowed_brands and allowed_islands (v6 feature)"""
        new_user = {
            "username": "TEST_user_v7",
            "password": "TestPass123!",
            "full_name": "Test User V7",
            "role": "viewer",
            "allowed_brands": ["audi", "volkswagen"],
            "allowed_islands": ["tenerife"]
        }
        
        # Create user
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=self.headers)
        assert response.status_code in [200, 201], f"Create user failed: {response.text}"
        
        # Verify user created with permissions
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = users_response.json().get("users", [])
        test_user = next((u for u in users if u["username"] == "TEST_user_v7"), None)
        assert test_user is not None, "Created user not found"
        assert test_user.get("allowed_brands") == ["audi", "volkswagen"]
        assert test_user.get("allowed_islands") == ["tenerife"]
        
        # Cleanup - delete user
        user_id = test_user.get("id")
        if user_id:
            requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
        
        print("PASS: Create user with allowed_brands and allowed_islands works")
    
    def test_update_user_permissions(self):
        """Test updating user permissions"""
        # Create a test user
        new_user = {
            "username": "TEST_update_user",
            "password": "TestPass123!",
            "role": "viewer"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=self.headers)
        
        # Get user ID
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        users = users_response.json().get("users", [])
        test_user = next((u for u in users if u["username"] == "TEST_update_user"), None)
        
        if test_user:
            user_id = test_user.get("id")
            
            # Update permissions
            update_data = {
                "allowed_brands": ["skoda"],
                "allowed_islands": ["gran-canaria", "lanzarote"]
            }
            update_response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, headers=self.headers)
            assert update_response.status_code == 200
            
            # Verify update
            users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
            users = users_response.json().get("users", [])
            updated_user = next((u for u in users if u["username"] == "TEST_update_user"), None)
            assert updated_user.get("allowed_brands") == ["skoda"]
            assert updated_user.get("allowed_islands") == ["gran-canaria", "lanzarote"]
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
            print("PASS: Update user permissions works")
        else:
            pytest.skip("Could not create test user")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
