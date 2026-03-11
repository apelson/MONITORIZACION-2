"""
Test Suite for Siempria Conteo v6 Features
- User permissions (allowed_brands, allowed_islands)
- User CRUD with permission fields
- Auth login returns permissions
- All existing functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Verify health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "siempria-conteo"
        print(f"✓ Health check passed: {data}")

    def test_login_success_returns_permissions(self):
        """Login should return user with allowed_brands and allowed_islands"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify token
        assert "token" in data
        assert len(data["token"]) > 0
        
        # Verify user object with v6 permission fields
        assert "user" in data
        user = data["user"]
        assert user["username"] == "admin"
        assert user["role"] == "admin"
        assert "allowed_brands" in user, "v6 feature: allowed_brands should be in login response"
        assert "allowed_islands" in user, "v6 feature: allowed_islands should be in login response"
        assert isinstance(user["allowed_brands"], list)
        assert isinstance(user["allowed_islands"], list)
        print(f"✓ Login returns permissions: allowed_brands={user['allowed_brands']}, allowed_islands={user['allowed_islands']}")
        
        return data["token"]

    def test_login_invalid_credentials(self):
        """Login with wrong credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")


class TestUserCRUDWithPermissions:
    """User CRUD tests with v6 permission fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Auth headers for API calls"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_users_returns_permissions(self, auth_headers):
        """GET /api/users should return allowed_brands and allowed_islands for each user"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        for user in data["users"]:
            assert "allowed_brands" in user, f"User {user['username']} missing allowed_brands"
            assert "allowed_islands" in user, f"User {user['username']} missing allowed_islands"
            assert isinstance(user["allowed_brands"], list)
            assert isinstance(user["allowed_islands"], list)
        
        print(f"✓ GET users returns {data['total']} users with permission fields")
    
    def test_create_user_with_permissions(self, auth_headers):
        """Create user with specific allowed_brands and allowed_islands"""
        test_username = "TEST_perm_user"
        
        # Clean up if exists
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        if users_response.status_code == 200:
            for u in users_response.json().get("users", []):
                if u["username"] == test_username:
                    requests.delete(f"{BASE_URL}/api/users/{u['id']}", headers=auth_headers)
        
        # Create user with specific permissions
        create_payload = {
            "username": test_username,
            "password": "TestPass123!",
            "full_name": "Test Permission User",
            "role": "viewer",
            "allowed_brands": ["audi", "volkswagen"],
            "allowed_islands": ["tenerife", "gran-canaria"]
        }
        response = requests.post(f"{BASE_URL}/api/users", json=create_payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        # Verify user was created with permissions
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = users_response.json()["users"]
        created_user = next((u for u in users if u["username"] == test_username), None)
        
        assert created_user is not None, "Created user not found"
        assert created_user["allowed_brands"] == ["audi", "volkswagen"], f"allowed_brands mismatch: {created_user['allowed_brands']}"
        assert created_user["allowed_islands"] == ["tenerife", "gran-canaria"], f"allowed_islands mismatch: {created_user['allowed_islands']}"
        
        print(f"✓ Created user with permissions: brands={created_user['allowed_brands']}, islands={created_user['allowed_islands']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/users/{created_user['id']}", headers=auth_headers)
    
    def test_update_user_permissions(self, auth_headers):
        """Update user's allowed_brands and allowed_islands"""
        test_username = "TEST_update_perm"
        
        # Clean up if exists
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        for u in users_response.json().get("users", []):
            if u["username"] == test_username:
                requests.delete(f"{BASE_URL}/api/users/{u['id']}", headers=auth_headers)
        
        # Create user without permissions
        create_response = requests.post(f"{BASE_URL}/api/users", json={
            "username": test_username,
            "password": "TestPass123!",
            "role": "viewer"
        }, headers=auth_headers)
        assert create_response.status_code == 200
        
        # Find user id
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        user = next(u for u in users_response.json()["users"] if u["username"] == test_username)
        user_id = user["id"]
        
        # Verify initial state (empty permissions)
        assert user["allowed_brands"] == []
        assert user["allowed_islands"] == []
        
        # Update permissions
        update_response = requests.put(f"{BASE_URL}/api/users/{user_id}", json={
            "allowed_brands": ["honda", "skoda"],
            "allowed_islands": ["lanzarote"]
        }, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify update persisted
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        updated_user = next(u for u in users_response.json()["users"] if u["username"] == test_username)
        
        assert updated_user["allowed_brands"] == ["honda", "skoda"]
        assert updated_user["allowed_islands"] == ["lanzarote"]
        
        print(f"✓ Updated user permissions: brands={updated_user['allowed_brands']}, islands={updated_user['allowed_islands']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers)
    
    def test_edit_admin_user(self, auth_headers):
        """Admin should be able to edit their own user (except delete)"""
        # Get admin user id
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        admin_user = next(u for u in users_response.json()["users"] if u["username"] == "admin")
        
        # Admin can update their own full_name
        original_name = admin_user.get("full_name", "Administrador")
        update_response = requests.put(f"{BASE_URL}/api/users/{admin_user['id']}", json={
            "full_name": "Admin Test Name"
        }, headers=auth_headers)
        assert update_response.status_code == 200
        
        # Verify and restore
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        admin_user = next(u for u in users_response.json()["users"] if u["username"] == "admin")
        assert admin_user["full_name"] == "Admin Test Name"
        
        # Restore original name
        requests.put(f"{BASE_URL}/api/users/{admin_user['id']}", json={
            "full_name": original_name
        }, headers=auth_headers)
        
        print("✓ Admin can edit self")
    
    def test_toggle_user_active_status(self, auth_headers):
        """Toggle user active/inactive status"""
        test_username = "TEST_toggle_user"
        
        # Clean up if exists
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        for u in users_response.json().get("users", []):
            if u["username"] == test_username:
                requests.delete(f"{BASE_URL}/api/users/{u['id']}", headers=auth_headers)
        
        # Create user (active by default)
        requests.post(f"{BASE_URL}/api/users", json={
            "username": test_username,
            "password": "TestPass123!",
            "role": "viewer"
        }, headers=auth_headers)
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        user = next(u for u in users_response.json()["users"] if u["username"] == test_username)
        user_id = user["id"]
        
        # Initially active
        assert user.get("is_active", True) == True
        
        # Toggle to inactive
        requests.put(f"{BASE_URL}/api/users/{user_id}", json={"is_active": False}, headers=auth_headers)
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        user = next(u for u in users_response.json()["users"] if u["username"] == test_username)
        assert user["is_active"] == False
        
        # Toggle back to active
        requests.put(f"{BASE_URL}/api/users/{user_id}", json={"is_active": True}, headers=auth_headers)
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        user = next(u for u in users_response.json()["users"] if u["username"] == test_username)
        assert user["is_active"] == True
        
        print("✓ User active toggle works")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers)
    
    def test_delete_user(self, auth_headers):
        """Delete user works"""
        test_username = "TEST_delete_user"
        
        # Create user
        requests.post(f"{BASE_URL}/api/users", json={
            "username": test_username,
            "password": "TestPass123!",
            "role": "viewer"
        }, headers=auth_headers)
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        user = next((u for u in users_response.json()["users"] if u["username"] == test_username), None)
        
        if user:
            # Delete
            delete_response = requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=auth_headers)
            assert delete_response.status_code == 200
            
            # Verify deleted
            users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
            deleted_user = next((u for u in users_response.json()["users"] if u["username"] == test_username), None)
            assert deleted_user is None
            
            print("✓ User delete works")


class TestRankingEndpoints:
    """Ranking endpoints tests"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        return {"Authorization": f"Bearer {response.json()['token']}", "Content-Type": "application/json"}
    
    def test_realtime_ranking(self, auth_headers):
        """GET /api/ranking/realtime returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/ranking/realtime", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "ranking" in data
        assert "totals" in data
        assert "cameras_total" in data
        assert "cameras_online" in data
        
        # Empty ranking is expected (no physical cameras)
        print(f"✓ Realtime ranking: {len(data['ranking'])} brands, {data['cameras_online']}/{data['cameras_total']} cameras")
    
    def test_brand_ranking(self, auth_headers):
        """GET /api/ranking/by-brand returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-brand?period=day", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "ranking" in data
        assert "period" in data
        assert data["period"] == "day"
        print(f"✓ Brand ranking: {len(data['ranking'])} brands")
    
    def test_center_ranking(self, auth_headers):
        """GET /api/ranking/by-center returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-center?period=day", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "ranking" in data
        print(f"✓ Center ranking: {len(data['ranking'])} centers")
    
    def test_island_ranking(self, auth_headers):
        """GET /api/ranking/by-island returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/ranking/by-island", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "islands" in data
        print(f"✓ Island ranking: {len(data['islands'])} islands")


class TestCamerasEndpoint:
    """Cameras endpoint tests"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "Conteo2024!"
        })
        return {"Authorization": f"Bearer {response.json()['token']}", "Content-Type": "application/json"}
    
    def test_get_cameras(self, auth_headers):
        """GET /api/cameras returns list"""
        response = requests.get(f"{BASE_URL}/api/cameras", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "cameras" in data
        print(f"✓ Cameras endpoint: {len(data['cameras'])} cameras configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
