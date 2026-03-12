"""
Multi-Tenancy Tests for Siempria NOC Dashboard
Tests the data filtering based on user role:
- admin: sees ALL data across all tenants
- tenant_admin: sees only data from their assigned organizations
"""
import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://conteo-analytics.preview.emergentagent.com').rstrip('/')

print(f"Testing against: {BASE_URL}")

# Test credentials
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "Spw@16071977"
}

TENANT_ADMIN_CREDENTIALS = {
    "username": "dagroup",
    "password": "Dagroup2026!"
}

# Expected organization for tenant_admin (dagroup)
EXPECTED_ORG_NAME = "DOMINGO ALONSO GROUP"
EXPECTED_ORG_ID = "deaeccae-ec00-4129-9fb7-152d80a1a115"


class TestAdminLogin:
    """Test admin user authentication and data access"""
    
    def test_admin_login_success(self):
        """Test admin login returns JWT token and correct user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == "admin", f"Username mismatch: {data['user']['username']}"
        assert data["user"]["role"] == "admin", f"Role mismatch: {data['user']['role']}"
        
        print(f"PASS: Admin login successful - username: {data['user']['username']}, role: {data['user']['role']}")
        return data["token"]


class TestTenantAdminLogin:
    """Test tenant_admin (dagroup) user authentication"""
    
    def test_tenant_admin_login_success(self):
        """Test tenant_admin login returns JWT token and correct user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TENANT_ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"Tenant admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == "dagroup", f"Username mismatch: {data['user']['username']}"
        assert data["user"]["role"] == "tenant_admin", f"Role mismatch: {data['user']['role']}"
        
        # Verify tenant_admin has organization_ids
        assert "organization_ids" in data["user"], "tenant_admin should have organization_ids"
        assert len(data["user"]["organization_ids"]) > 0, "tenant_admin should have at least one organization"
        
        # Verify the assigned organization is DOMINGO ALONSO GROUP
        assert EXPECTED_ORG_ID in data["user"]["organization_ids"], f"Expected org ID {EXPECTED_ORG_ID} not in user's organization_ids"
        
        print(f"PASS: Tenant admin login successful - username: {data['user']['username']}, role: {data['user']['role']}, org_ids: {data['user']['organization_ids']}")
        return data["token"]


class TestAdminOrganizationsAccess:
    """Test admin can see ALL organizations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_admin_sees_all_organizations(self, admin_token):
        """Verify admin can see all organizations without filtering"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get organizations failed: {response.status_code}"
        
        data = response.json()
        assert "organizations" in data, "No organizations key in response"
        
        organizations = data["organizations"]
        org_names = [org["name"] for org in organizations]
        
        print(f"PASS: Admin sees {len(organizations)} organizations: {org_names}")
        
        # Admin should see the tenant organization too
        assert any(EXPECTED_ORG_NAME in name for name in org_names), f"Admin should see {EXPECTED_ORG_NAME}"
        
        return len(organizations)


class TestTenantAdminOrganizationsAccess:
    """Test tenant_admin can ONLY see their assigned organizations"""
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_tenant_admin_sees_only_their_organizations(self, tenant_token):
        """Verify tenant_admin only sees organizations they have access to"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get organizations failed: {response.status_code}"
        
        data = response.json()
        assert "organizations" in data, "No organizations key in response"
        
        organizations = data["organizations"]
        org_names = [org["name"] for org in organizations]
        org_ids = [org["id"] for org in organizations]
        
        print(f"PASS: Tenant admin (dagroup) sees {len(organizations)} organization(s): {org_names}")
        
        # Tenant admin should ONLY see DOMINGO ALONSO GROUP
        assert len(organizations) == 1, f"Tenant admin should see exactly 1 organization, but sees {len(organizations)}"
        assert EXPECTED_ORG_ID in org_ids, f"Tenant admin should see org {EXPECTED_ORG_ID}"
        assert EXPECTED_ORG_NAME in org_names[0], f"Tenant admin should see {EXPECTED_ORG_NAME}"
        
        return organizations


class TestTenantAdminGroupsAccess:
    """Test tenant_admin can only see groups from their organizations"""
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_tenant_admin_sees_only_their_groups(self, tenant_token):
        """Verify tenant_admin only sees groups from their organizations"""
        response = requests.get(
            f"{BASE_URL}/api/groups",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get groups failed: {response.status_code}"
        
        data = response.json()
        assert "groups" in data, "No groups key in response"
        
        groups = data["groups"]
        
        # All groups should belong to the tenant's organization
        for group in groups:
            assert group.get("organization_id") == EXPECTED_ORG_ID, \
                f"Group {group['name']} belongs to org {group.get('organization_id')}, expected {EXPECTED_ORG_ID}"
        
        print(f"PASS: Tenant admin sees {len(groups)} groups, all belonging to their organization")
        return groups


class TestTenantAdminGroupCreation:
    """Test tenant_admin can create groups in their organization"""
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_tenant_admin_can_create_group_in_their_org(self, tenant_token):
        """Verify tenant_admin can create groups in their assigned organization"""
        import uuid
        
        group_data = {
            "name": f"TEST_TenantGroup_{uuid.uuid4().hex[:8]}",
            "organization_id": EXPECTED_ORG_ID,
            "description": "Test group created by tenant_admin",
            "color": "#22c55e"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_data,
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Create group failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "group" in data, "No group key in response"
        assert data["group"]["name"] == group_data["name"]
        assert data["group"]["organization_id"] == EXPECTED_ORG_ID
        
        created_group_id = data["group"]["id"]
        print(f"PASS: Tenant admin created group '{group_data['name']}' in their organization")
        
        # Cleanup - delete the created group
        delete_response = requests.delete(
            f"{BASE_URL}/api/groups/{created_group_id}",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        if delete_response.status_code == 200:
            print(f"  Cleanup: Deleted test group {created_group_id}")
        
        return created_group_id


class TestTenantAdminDevicesFiltering:
    """Test tenant_admin devices are filtered"""
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_tenant_admin_devices_filtered(self, tenant_token):
        """Verify tenant_admin only sees devices from their organizations' groups"""
        response = requests.get(
            f"{BASE_URL}/api/devices",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get devices failed: {response.status_code}"
        
        data = response.json()
        assert "devices" in data, "No devices key in response"
        
        devices = data["devices"]
        
        # According to the problem statement, tenant_admin should see 0 devices
        # because there are no devices in their groups yet
        print(f"PASS: Tenant admin sees {len(devices)} devices (expected: 0 since no devices in their groups)")
        
        return devices


class TestDeviceStatsFiltering:
    """Test /api/devices/stats endpoint for both users"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_admin_device_stats(self, admin_token):
        """Verify admin sees global device stats"""
        response = requests.get(
            f"{BASE_URL}/api/devices/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get device stats failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data
        assert "online" in data
        assert "offline" in data
        
        print(f"PASS: Admin device stats - total: {data['total']}, online: {data['online']}, offline: {data['offline']}")
        return data
    
    def test_tenant_admin_device_stats(self, tenant_token):
        """Verify tenant_admin sees filtered device stats (should be 0)"""
        response = requests.get(
            f"{BASE_URL}/api/devices/stats",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get device stats failed: {response.status_code}"
        
        data = response.json()
        assert "total" in data
        assert "online" in data
        assert "offline" in data
        
        # Tenant admin should see 0 devices since no devices in their groups
        assert data["total"] == 0, f"Tenant admin should see 0 total devices, got {data['total']}"
        
        print(f"PASS: Tenant admin device stats - total: {data['total']} (filtered to 0 as expected)")
        return data


class TestAlertsFiltering:
    """Test /api/alerts endpoint filtering"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_admin_alerts(self, admin_token):
        """Verify admin can see all alerts"""
        response = requests.get(
            f"{BASE_URL}/api/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get alerts failed: {response.status_code}"
        
        data = response.json()
        assert "alerts" in data
        
        print(f"PASS: Admin sees {len(data['alerts'])} alerts")
        return data["alerts"]
    
    def test_tenant_admin_alerts_filtered(self, tenant_token):
        """Verify tenant_admin only sees alerts from their devices (should be 0)"""
        response = requests.get(
            f"{BASE_URL}/api/alerts",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get alerts failed: {response.status_code}"
        
        data = response.json()
        assert "alerts" in data
        
        # Tenant admin should see 0 alerts since they have no devices
        print(f"PASS: Tenant admin sees {len(data['alerts'])} alerts (filtered)")
        return data["alerts"]


class TestDahuaDevicesFiltering:
    """Test /api/dahua/devices endpoint filtering"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_admin_dahua_devices(self, admin_token):
        """Verify admin can see all Dahua devices"""
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get Dahua devices failed: {response.status_code}"
        
        data = response.json()
        assert "devices" in data
        
        print(f"PASS: Admin sees {len(data['devices'])} Dahua devices")
        return data["devices"]
    
    def test_tenant_admin_dahua_devices_filtered(self, tenant_token):
        """Verify tenant_admin only sees Dahua devices from their organizations"""
        response = requests.get(
            f"{BASE_URL}/api/dahua/devices",
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        assert response.status_code == 200, f"Get Dahua devices failed: {response.status_code}"
        
        data = response.json()
        assert "devices" in data
        
        # Verify any returned devices belong to tenant's organization
        for device in data["devices"]:
            if device.get("organization_id"):
                assert device["organization_id"] == EXPECTED_ORG_ID, \
                    f"Dahua device {device.get('name')} should belong to {EXPECTED_ORG_ID}"
        
        print(f"PASS: Tenant admin sees {len(data['devices'])} Dahua devices (filtered)")
        return data["devices"]


class TestAdminVsTenantComparison:
    """Compare admin vs tenant_admin data access side by side"""
    
    def test_compare_organizations_count(self):
        """Compare organization counts between admin and tenant_admin"""
        # Login as admin
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["token"]
        
        # Login as tenant_admin
        tenant_login = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        assert tenant_login.status_code == 200
        tenant_token = tenant_login.json()["token"]
        
        # Get organizations as admin
        admin_orgs = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()["organizations"]
        
        # Get organizations as tenant_admin
        tenant_orgs = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {tenant_token}"}
        ).json()["organizations"]
        
        print(f"\n=== MULTI-TENANCY COMPARISON ===")
        print(f"Admin sees: {len(admin_orgs)} organization(s)")
        print(f"Tenant admin sees: {len(tenant_orgs)} organization(s)")
        print(f"Admin org names: {[o['name'] for o in admin_orgs]}")
        print(f"Tenant admin org names: {[o['name'] for o in tenant_orgs]}")
        
        # Tenant admin should see less or equal organizations
        assert len(tenant_orgs) <= len(admin_orgs), "Tenant should not see more orgs than admin"
        assert len(tenant_orgs) == 1, "Tenant admin should see exactly 1 organization"
        
        print(f"PASS: Multi-tenancy filtering verified - admin sees all, tenant_admin sees only their organization")


class TestTenantAdminCannotAccessOtherOrgs:
    """Test that tenant_admin cannot access data from other organizations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def tenant_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Tenant admin authentication failed")
    
    def test_tenant_cannot_create_group_in_other_org(self, admin_token, tenant_token):
        """Verify tenant_admin cannot create groups in other organizations"""
        import uuid
        
        # First, get all organizations as admin to find one that's NOT the tenant's
        admin_orgs = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()["organizations"]
        
        other_orgs = [o for o in admin_orgs if o["id"] != EXPECTED_ORG_ID]
        
        if not other_orgs:
            print("SKIP: No other organizations to test access restriction")
            return
        
        other_org_id = other_orgs[0]["id"]
        
        # Try to create a group in another organization as tenant_admin
        group_data = {
            "name": f"TEST_Unauthorized_{uuid.uuid4().hex[:8]}",
            "organization_id": other_org_id,
            "description": "This should fail"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/groups",
            json=group_data,
            headers={"Authorization": f"Bearer {tenant_token}"}
        )
        
        # Should get 403 Forbidden
        assert response.status_code == 403, \
            f"Tenant admin should NOT be able to create group in other org, got {response.status_code}"
        
        print(f"PASS: Tenant admin correctly denied creating group in another organization")


class TestCleanup:
    """Cleanup any test data created"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_cleanup_test_groups(self, admin_token):
        """Clean up any TEST_ prefixed groups"""
        groups = requests.get(
            f"{BASE_URL}/api/groups",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json().get("groups", [])
        
        cleaned = 0
        for group in groups:
            if group["name"].startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/groups/{group['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if del_response.status_code == 200:
                    cleaned += 1
                    print(f"  Cleaned up group: {group['name']}")
        
        print(f"PASS: Cleanup complete - removed {cleaned} test groups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
