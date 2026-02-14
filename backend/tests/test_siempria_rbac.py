"""
Siempria Network Monitor - RBAC and CRA Testing
Tests for roles, permissions, CRA status, and user management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://noc-responsive-build.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Spw@16071977"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful - User: {data['user']['username']}, Role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wrong_user",
            "password": "wrong_password"
        })
        assert response.status_code in [401, 400]
        print(f"✓ Invalid credentials correctly rejected with status {response.status_code}")


class TestRolesAndPermissions:
    """Tests for RBAC system - Roles and Permissions"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_get_my_permissions(self, auth_token):
        """Test /api/roles/my-permissions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/roles/my-permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "username" in data
        assert "role_id" in data
        assert "role_name" in data
        assert "permissions" in data
        
        # Verify admin has correct role
        assert data["role_id"] == "admin"
        assert data["role_name"] == "Administrador"
        
        # Verify admin permissions include key sections
        perms = data["permissions"]
        assert "devices" in perms
        assert "cra" in perms
        assert "users" in perms
        assert "roles" in perms
        
        # Admin should have all permissions
        assert "view" in perms["devices"]
        assert "edit" in perms["devices"]
        assert "create" in perms["devices"]
        assert "delete" in perms["devices"]
        
        print(f"✓ My permissions fetched - Role: {data['role_name']}, Permissions: {len(perms)} sections")
    
    def test_get_roles_list(self, auth_token):
        """Test /api/roles endpoint returns 4 system roles"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "roles" in data
        roles = data["roles"]
        
        # Verify we have 4 system roles
        assert len(roles) >= 4, f"Expected at least 4 roles, got {len(roles)}"
        
        # Verify expected role IDs exist
        role_ids = [r["id"] for r in roles]
        expected_roles = ["admin", "technician", "client", "operator"]
        for expected in expected_roles:
            assert expected in role_ids, f"Missing role: {expected}"
        
        # Verify each role has required fields
        for role in roles:
            assert "id" in role
            assert "name" in role
            assert "permissions" in role
            assert "is_system" in role
        
        print(f"✓ Roles list fetched - {len(roles)} roles found: {role_ids}")
    
    def test_admin_role_has_full_permissions(self, auth_token):
        """Verify admin role has full system permissions"""
        response = requests.get(
            f"{BASE_URL}/api/roles/admin",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        role = response.json()
        
        assert role["id"] == "admin"
        assert role["name"] == "Administrador"
        assert role["is_system"] == True
        
        # Admin should have all permissions in all sections
        perms = role["permissions"]
        assert "cra" in perms and "view" in perms["cra"]
        assert "users" in perms and "create" in perms["users"]
        assert "roles" in perms and "edit" in perms["roles"]
        
        print(f"✓ Admin role verified with full permissions")
    
    def test_operator_role_has_cra_permissions(self, auth_token):
        """Verify Operator CRA role has CRA permissions"""
        response = requests.get(
            f"{BASE_URL}/api/roles/operator",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        role = response.json()
        
        assert role["id"] == "operator"
        assert role["name"] == "Operador CRA"
        
        # Operator should have CRA view and manage permissions
        perms = role["permissions"]
        assert "cra" in perms
        assert "view" in perms["cra"]
        assert "manage" in perms["cra"]
        
        # Operator should NOT have users/roles permissions
        assert perms.get("users", []) == []
        assert perms.get("roles", []) == []
        
        print(f"✓ Operator CRA role verified with CRA permissions")


class TestCRADashboard:
    """Tests for CRA (Central Receptora de Alarmas) endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_cra_status(self, auth_token):
        """Test /api/cra/status returns correct device counts"""
        response = requests.get(
            f"{BASE_URL}/api/cra/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "total_devices" in data
        assert "online" in data
        assert "offline" in data
        assert "uptime_percentage" in data
        
        # Verify data consistency
        assert data["total_devices"] == data["online"] + data["offline"]
        assert 0 <= data["uptime_percentage"] <= 100
        
        print(f"✓ CRA Status - Total: {data['total_devices']}, Online: {data['online']}, Offline: {data['offline']}")
    
    def test_cra_devices_list(self, auth_token):
        """Test /api/cra/devices returns CRA devices"""
        response = requests.get(
            f"{BASE_URL}/api/cra/devices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "devices" in data
        devices = data["devices"]
        
        # Verify we have CRA devices
        assert len(devices) > 0, "No CRA devices found"
        
        # Verify each device has required fields
        for device in devices:
            assert "id" in device
            assert "name" in device
            assert "ip_address" in device
            assert "status" in device
            assert "is_cra" in device
            assert device["is_cra"] == True, f"Device {device['name']} is not marked as CRA"
        
        device_names = [d["name"] for d in devices]
        print(f"✓ CRA Devices - {len(devices)} devices: {device_names}")
    
    def test_cra_alerts(self, auth_token):
        """Test /api/cra/alerts endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/cra/alerts?limit=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        # Alerts can be empty, but structure should be correct
        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            assert "device_name" in alert or "id" in alert
        
        print(f"✓ CRA Alerts - {len(data['alerts'])} alerts returned")


class TestUsers:
    """Tests for user management endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_list_users(self, auth_token):
        """Test /api/users returns user list"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        users = data["users"]
        
        # Should have at least admin user
        assert len(users) >= 1
        
        # Verify user structure
        usernames = []
        for user in users:
            assert "id" in user
            assert "username" in user
            assert "email" in user
            usernames.append(user["username"])
        
        # Admin should exist
        assert "admin" in usernames
        
        print(f"✓ Users list - {len(users)} users: {usernames}")
    
    def test_get_user_permissions(self, auth_token):
        """Test getting permissions for a specific user"""
        # First get admin user ID
        users_response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        users = users_response.json()["users"]
        admin_user = next((u for u in users if u["username"] == "admin"), None)
        
        assert admin_user is not None
        
        # Get permissions for admin user
        response = requests.get(
            f"{BASE_URL}/api/roles/user/{admin_user['id']}/permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["role_id"] == "admin"
        assert "permissions" in data
        
        print(f"✓ User permissions fetched for admin - Role: {data['role_name']}")


class TestAvailablePermissions:
    """Test available permissions endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_available_permissions(self, auth_token):
        """Test /api/roles/available-permissions returns all permission definitions"""
        response = requests.get(
            f"{BASE_URL}/api/roles/available-permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "permissions" in data
        perms = data["permissions"]
        
        # Verify key sections exist
        expected_sections = ["devices", "gallery", "cra", "live", "users", "settings", "roles"]
        for section in expected_sections:
            assert section in perms, f"Missing permission section: {section}"
            assert "name" in perms[section]
            assert "permissions" in perms[section]
        
        print(f"✓ Available permissions - {len(perms)} sections: {list(perms.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
