"""
Test Brand Statistics API Endpoints
Tests for vehicle brand visit ranking system for NOC WatchTower
Brands: AUDI, VOLKSWAGEN, SKODA, HONDA, DUCATI, DAOCASION
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = {"username": "admin", "password": "admin123"}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestBrandStatisticsAPI:
    """Brand Statistics API endpoint tests"""
    
    def test_get_brands_returns_six_brands(self, auth_headers):
        """GET /api/brand-statistics/brands - Should return 6 vehicle brands"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/brands", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "brands" in data
        assert len(data["brands"]) == 6
        
        # Verify all expected brands are present
        brand_ids = [b["id"] for b in data["brands"]]
        expected_brands = ["audi", "volkswagen", "skoda", "honda", "ducati", "daocasion"]
        for brand in expected_brands:
            assert brand in brand_ids, f"Brand {brand} not found"
        
        # Verify brand structure (id, name, color)
        for brand in data["brands"]:
            assert "id" in brand
            assert "name" in brand
            assert "color" in brand
            assert brand["color"].startswith("#")  # Color is hex format
    
    def test_get_ranking_default_period(self, auth_headers):
        """GET /api/brand-statistics/ranking - Default ranking (week)"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/ranking", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "ranking" in data
        assert "period" in data
        assert data["period"] == "week"  # Default period
        assert "start_date" in data
        assert "end_date" in data
        assert "total_brands" in data
        
        # Should have 6 brands in ranking (even with 0 visits)
        assert len(data["ranking"]) == 6
        
        # Verify ranking structure
        for item in data["ranking"]:
            assert "brand_id" in item
            assert "brand_name" in item
            assert "brand_color" in item
            assert "total_visits" in item
            assert "entries" in item
            assert "exits" in item
    
    def test_get_ranking_with_period_filter(self, auth_headers):
        """GET /api/brand-statistics/ranking?period=day - Filter by day"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking?period=day", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "day"
    
    def test_get_ranking_with_month_period(self, auth_headers):
        """GET /api/brand-statistics/ranking?period=month - Filter by month"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking?period=month", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "month"
    
    def test_get_ranking_with_island_filter(self, auth_headers):
        """GET /api/brand-statistics/ranking?island=tenerife - Filter by island"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking?island=tenerife&period=week", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["island"] == "tenerife"
    
    def test_get_summary(self, auth_headers):
        """GET /api/brand-statistics/summary - Get statistics summary"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/summary", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "today_visits" in data
        assert "week_visits" in data
        assert "month_visits" in data
        assert "total_brands" in data
        assert "last_updated" in data
        
        # Verify data types
        assert isinstance(data["today_visits"], int)
        assert isinstance(data["week_visits"], int)
        assert isinstance(data["month_visits"], int)
        assert data["total_brands"] == 6
    
    def test_get_ranking_by_island_matrix(self, auth_headers):
        """GET /api/brand-statistics/ranking-by-island - Get cross-island comparison"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking-by-island?period=week", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "matrix" in data
        assert "islands" in data
        assert "brands" in data
        assert "period" in data
        
        # Verify 7 Canary Islands
        expected_islands = ["tenerife", "gran-canaria", "lanzarote", "fuerteventura", 
                          "la-palma", "la-gomera", "el-hierro"]
        assert len(data["islands"]) == 7
        for island in expected_islands:
            assert island in data["islands"]
        
        # Verify 6 brands
        assert len(data["brands"]) == 6
        
        # Verify matrix structure
        assert len(data["matrix"]) == 6  # One entry per brand
        for brand_id, brand_data in data["matrix"].items():
            assert "brand_name" in brand_data
            assert "brand_color" in brand_data
            assert "islands" in brand_data
            assert "total" in brand_data
    
    def test_brands_endpoint_requires_auth(self):
        """GET /api/brand-statistics/brands without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/brands")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_ranking_endpoint_requires_auth(self):
        """GET /api/brand-statistics/ranking without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/ranking")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_summary_endpoint_requires_auth(self):
        """GET /api/brand-statistics/summary without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/brand-statistics/summary")
        assert response.status_code == 401 or response.status_code == 403


class TestBrandRecordAPI:
    """Test recording brand visit events"""
    
    def test_record_brand_visit(self, auth_headers):
        """POST /api/brand-statistics/record - Record a visit event"""
        payload = {
            "brand_id": "audi",
            "camera_id": "test-camera-001",
            "island": "tenerife",
            "entries": 5,
            "exits": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/record", 
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert data["message"] == "Visit recorded successfully"
        assert "record_id" in data
        assert data["brand_id"] == "audi"
        assert data["visit_count"] == 8  # entries + exits
    
    def test_record_invalid_brand_fails(self, auth_headers):
        """POST /api/brand-statistics/record with invalid brand should fail"""
        payload = {
            "brand_id": "invalid-brand",
            "camera_id": "test-camera-001",
            "island": "tenerife",
            "entries": 1,
            "exits": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/record", 
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid brand_id" in response.json().get("detail", "")


class TestDailyTrendAPI:
    """Test daily trend endpoint"""
    
    def test_get_daily_trend(self, auth_headers):
        """GET /api/brand-statistics/daily-trend/{brand_id}"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/daily-trend/audi?days=7", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "brand_id" in data
        assert data["brand_id"] == "audi"
        assert "brand_name" in data
        assert "trend" in data
        assert "total_visits" in data
    
    def test_get_daily_trend_invalid_brand_fails(self, auth_headers):
        """GET /api/brand-statistics/daily-trend/invalid - Should fail"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/daily-trend/invalid-brand", 
            headers=auth_headers
        )
        
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
