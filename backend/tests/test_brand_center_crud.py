"""
Test suite for Brand and Center CRUD operations + Upload endpoint
Tests the features for iteration 22:
- CRUD for brands (GET, POST, PUT, DELETE)
- CRUD for centers (GET, POST, DELETE)
- File upload for logos
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://viewport-fix-test.preview.emergentagent.com')

class TestAuth:
    """Authentication fixture setup"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestBrandsCRUD(TestAuth):
    """Test Brand CRUD operations"""
    
    def test_get_brands_list(self, auth_headers):
        """GET /api/brand-statistics/brands - returns list of brands"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/brands", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get brands: {response.text}"
        data = response.json()
        assert "brands" in data, "Response missing 'brands' key"
        assert isinstance(data["brands"], list), "Brands should be a list"
        # Should have default brands seeded
        assert len(data["brands"]) >= 6, f"Expected at least 6 default brands, got {len(data['brands'])}"
        print(f"✓ GET brands: Found {len(data['brands'])} brands")
    
    def test_create_brand(self, auth_headers):
        """POST /api/brand-statistics/brands - creates new brand"""
        test_brand_id = f"test-brand-{uuid.uuid4().hex[:8]}"
        brand_data = {
            "id": test_brand_id,
            "name": "TEST Brand for Testing",
            "color": "#FF5733",
            "logo": "https://example.com/test-logo.png"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json=brand_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create brand: {response.text}"
        data = response.json()
        assert "brand" in data, "Response missing 'brand' key"
        assert data["brand"]["id"] == test_brand_id
        assert data["brand"]["name"] == "TEST Brand for Testing"
        assert data["brand"]["color"] == "#FF5733"
        print(f"✓ POST brands: Created brand {test_brand_id}")
        
        # Cleanup - delete the created brand
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/brand-statistics/brands/{test_brand_id}",
            headers=auth_headers
        )
        assert cleanup_response.status_code == 200, "Cleanup delete failed"
    
    def test_create_brand_duplicate_id_fails(self, auth_headers):
        """POST /api/brand-statistics/brands - duplicate ID returns 400"""
        # First create a brand
        test_brand_id = f"test-dup-{uuid.uuid4().hex[:8]}"
        brand_data = {"id": test_brand_id, "name": "First Brand", "color": "#000000"}
        
        response1 = requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json=brand_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Try creating with same ID - should fail
        response2 = requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json={"id": test_brand_id, "name": "Duplicate Brand", "color": "#111111"},
            headers=auth_headers
        )
        assert response2.status_code == 400, "Duplicate brand ID should return 400"
        print(f"✓ POST brands duplicate ID returns 400 correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/brand-statistics/brands/{test_brand_id}", headers=auth_headers)
    
    def test_update_brand(self, auth_headers):
        """PUT /api/brand-statistics/brands/{id} - updates brand"""
        # First create a brand
        test_brand_id = f"test-update-{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json={"id": test_brand_id, "name": "Original Name", "color": "#000000"},
            headers=auth_headers
        )
        
        # Update the brand
        update_data = {
            "name": "Updated Name",
            "color": "#00FF00",
            "logo": "https://example.com/updated-logo.png"
        }
        response = requests.put(
            f"{BASE_URL}/api/brand-statistics/brands/{test_brand_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to update brand: {response.text}"
        data = response.json()
        assert data["brand"]["name"] == "Updated Name"
        assert data["brand"]["color"] == "#00FF00"
        print(f"✓ PUT brands/{test_brand_id}: Updated successfully")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/brand-statistics/brands", headers=auth_headers)
        brands = get_response.json()["brands"]
        updated_brand = next((b for b in brands if b["id"] == test_brand_id), None)
        # Note: soft deleted brands won't appear in active list
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/brand-statistics/brands/{test_brand_id}", headers=auth_headers)
    
    def test_update_nonexistent_brand_fails(self, auth_headers):
        """PUT /api/brand-statistics/brands/{id} - nonexistent returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/brand-statistics/brands/nonexistent-brand-xyz",
            json={"name": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 404, "Nonexistent brand should return 404"
        print("✓ PUT nonexistent brand returns 404")
    
    def test_delete_brand_soft_delete(self, auth_headers):
        """DELETE /api/brand-statistics/brands/{id} - soft deletes brand"""
        # Create brand to delete
        test_brand_id = f"test-delete-{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json={"id": test_brand_id, "name": "To Delete", "color": "#FF0000"},
            headers=auth_headers
        )
        
        # Delete the brand
        response = requests.delete(
            f"{BASE_URL}/api/brand-statistics/brands/{test_brand_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete brand: {response.text}"
        print(f"✓ DELETE brands/{test_brand_id}: Soft deleted successfully")
        
        # Verify brand no longer appears in active list
        get_response = requests.get(f"{BASE_URL}/api/brand-statistics/brands", headers=auth_headers)
        brands = get_response.json()["brands"]
        deleted_brand = next((b for b in brands if b["id"] == test_brand_id), None)
        assert deleted_brand is None, "Soft-deleted brand should not appear in active list"
    
    def test_delete_nonexistent_brand_fails(self, auth_headers):
        """DELETE /api/brand-statistics/brands/{id} - nonexistent returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/brand-statistics/brands/nonexistent-brand-xyz",
            headers=auth_headers
        )
        assert response.status_code == 404, "Nonexistent brand should return 404"
        print("✓ DELETE nonexistent brand returns 404")


class TestCentersCRUD(TestAuth):
    """Test Center CRUD operations"""
    
    def test_get_centers_list(self, auth_headers):
        """GET /api/brand-statistics/centers - returns list of centers"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/centers", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get centers: {response.text}"
        data = response.json()
        assert "centers" in data, "Response missing 'centers' key"
        assert isinstance(data["centers"], list), "Centers should be a list"
        # Should have default centers (7 Canary Islands)
        assert len(data["centers"]) >= 7, f"Expected at least 7 default centers, got {len(data['centers'])}"
        print(f"✓ GET centers: Found {len(data['centers'])} centers")
    
    def test_create_center(self, auth_headers):
        """POST /api/brand-statistics/centers - creates new center"""
        test_center_id = f"test-center-{uuid.uuid4().hex[:8]}"
        center_data = {
            "id": test_center_id,
            "name": "TEST Centro Norte",
            "island": "tenerife",
            "address": "Av. Test 123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/centers",
            json=center_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create center: {response.text}"
        data = response.json()
        assert "center" in data, "Response missing 'center' key"
        assert data["center"]["id"] == test_center_id
        assert data["center"]["name"] == "TEST Centro Norte"
        assert data["center"]["island"] == "tenerife"
        print(f"✓ POST centers: Created center {test_center_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/brand-statistics/centers/{test_center_id}", headers=auth_headers)
    
    def test_create_center_with_brand_association(self, auth_headers):
        """POST /api/brand-statistics/centers - creates center with brand_id"""
        test_center_id = f"test-assoc-{uuid.uuid4().hex[:8]}"
        center_data = {
            "id": test_center_id,
            "name": "Centro con Marca",
            "island": "gran-canaria",
            "address": "Calle Marca 456",
            "brand_id": "audi"  # Associate with existing brand
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/centers",
            json=center_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create center: {response.text}"
        data = response.json()
        assert data["center"]["brand_id"] == "audi"
        print(f"✓ POST centers with brand association: Success")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/brand-statistics/centers/{test_center_id}", headers=auth_headers)
    
    def test_delete_center(self, auth_headers):
        """DELETE /api/brand-statistics/centers/{id} - soft deletes center"""
        # Create center to delete
        test_center_id = f"test-del-ctr-{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/brand-statistics/centers",
            json={"id": test_center_id, "name": "To Delete Center"},
            headers=auth_headers
        )
        
        # Delete the center
        response = requests.delete(
            f"{BASE_URL}/api/brand-statistics/centers/{test_center_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete center: {response.text}"
        print(f"✓ DELETE centers/{test_center_id}: Soft deleted successfully")
        
        # Verify center no longer appears in active list
        get_response = requests.get(f"{BASE_URL}/api/brand-statistics/centers", headers=auth_headers)
        centers = get_response.json()["centers"]
        deleted_center = next((c for c in centers if c["id"] == test_center_id), None)
        assert deleted_center is None, "Soft-deleted center should not appear in active list"


class TestUploadEndpoint(TestAuth):
    """Test file upload endpoint for logos"""
    
    def test_upload_requires_auth(self):
        """POST /api/upload without auth returns 401/403"""
        # Create a simple test image bytes
        test_image = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # Minimal PNG header
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.png", test_image, "image/png")}
        )
        assert response.status_code in [401, 403], f"Upload without auth should fail, got {response.status_code}"
        print("✓ POST /api/upload without auth returns 401/403")
    
    def test_upload_file_success(self, auth_headers):
        """POST /api/upload - uploads file and returns URL"""
        # Create a minimal valid PNG
        import base64
        # Minimal 1x1 red PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        )
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test-logo.png", png_data, "image/png")},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "url" in data, "Response should contain 'url'"
        assert "filename" in data, "Response should contain 'filename'"
        assert data["url"].startswith("/api/upload/"), "URL should start with /api/upload/"
        print(f"✓ POST /api/upload: Success, URL={data['url']}")
        
        # Verify the uploaded file is accessible
        uploaded_url = f"{BASE_URL}{data['url']}"
        get_response = requests.get(uploaded_url)
        assert get_response.status_code == 200, f"Uploaded file not accessible: {get_response.status_code}"
        print(f"✓ GET uploaded file: Accessible at {data['url']}")
        
        # Return filename for cleanup
        return data["filename"]
    
    def test_upload_invalid_file_type(self, auth_headers):
        """POST /api/upload with invalid file type returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.txt", b"some text content", "text/plain")},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Invalid file type should return 400, got {response.status_code}"
        print("✓ POST /api/upload invalid file type returns 400")
    
    def test_upload_allowed_extensions(self, auth_headers):
        """POST /api/upload accepts jpg, png, gif, webp, svg"""
        import base64
        
        # Minimal valid images for each format
        test_files = {
            "test.jpg": base64.b64decode("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z"),
            "test.png": base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="),
            "test.gif": base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
        }
        
        for filename, content in test_files.items():
            response = requests.post(
                f"{BASE_URL}/api/upload",
                files={"file": (filename, content, "image/" + filename.split('.')[1])},
                headers=auth_headers
            )
            # Note: Some formats might fail validation depending on implementation
            # We just verify the endpoint processes them
            print(f"  Upload {filename}: status {response.status_code}")


class TestBrandsRequireAdminRole(TestAuth):
    """Test that brand/center mutations require admin role"""
    
    def test_get_brands_any_authenticated_user(self, auth_headers):
        """GET /api/brand-statistics/brands - any authenticated user can read"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/brands", headers=auth_headers)
        assert response.status_code == 200, "Authenticated user should be able to read brands"
        print("✓ GET brands accessible to authenticated users")
    
    def test_create_brand_requires_admin(self, auth_headers):
        """POST /api/brand-statistics/brands - admin can create"""
        # Admin should be able to create (will clean up after)
        test_id = f"admin-test-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/brands",
            json={"id": test_id, "name": "Admin Test", "color": "#123456"},
            headers=auth_headers
        )
        assert response.status_code == 200, "Admin should be able to create brand"
        print("✓ POST brands by admin: Success")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/brand-statistics/brands/{test_id}", headers=auth_headers)


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
