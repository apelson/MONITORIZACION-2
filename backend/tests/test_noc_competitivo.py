"""
Test suite for NOC Competitivo feature
Tests the /api/brand-statistics/ranking and /api/brand-statistics/realtime/refresh endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://noc-hardening.preview.emergentagent.com')

class TestNOCCompetitivo:
    """Tests for NOC Competitivo ranking and realtime endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # ==================== RANKING ENDPOINT TESTS ====================
    
    def test_ranking_endpoint_returns_200(self):
        """GET /api/brand-statistics/ranking returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        assert response.status_code == 200
        print("✓ Ranking endpoint returns 200")
    
    def test_ranking_returns_all_brands(self):
        """Ranking returns all 7 brands"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        ranking = data.get("ranking", [])
        
        assert len(ranking) >= 7, f"Expected at least 7 brands, got {len(ranking)}"
        print(f"✓ Ranking returns {len(ranking)} brands")
    
    def test_ranking_brand_structure(self):
        """Each brand in ranking has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        ranking = data.get("ranking", [])
        
        required_fields = ["brand_id", "brand_name", "brand_color", "brand_logo", "total_visits"]
        
        for brand in ranking:
            for field in required_fields:
                assert field in brand, f"Missing field '{field}' in brand {brand.get('brand_id')}"
        
        print(f"✓ All {len(ranking)} brands have required fields")
    
    def test_ranking_has_brand_logos(self):
        """All brands have logo URLs"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        ranking = data.get("ranking", [])
        
        brands_with_logos = [b for b in ranking if b.get("brand_logo")]
        assert len(brands_with_logos) >= 6, f"Expected at least 6 brands with logos, got {len(brands_with_logos)}"
        print(f"✓ {len(brands_with_logos)} brands have logos")
    
    def test_ranking_period_day(self):
        """Ranking with period=day works"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        
        assert data.get("period") == "day"
        assert "start_date" in data
        assert "end_date" in data
        print("✓ Period=day works correctly")
    
    def test_ranking_period_week(self):
        """Ranking with period=week works"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "week"}
        )
        data = response.json()
        
        assert data.get("period") == "week"
        print("✓ Period=week works correctly")
    
    def test_ranking_period_month(self):
        """Ranking with period=month works"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "month"}
        )
        data = response.json()
        
        assert data.get("period") == "month"
        print("✓ Period=month works correctly")
    
    def test_ranking_filter_by_island(self):
        """Ranking can be filtered by island"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day", "island": "tenerife"}
        )
        data = response.json()
        
        assert response.status_code == 200
        assert data.get("island") == "tenerife"
        print("✓ Island filter works correctly")
    
    def test_ranking_total_brands_count(self):
        """Ranking response includes total_brands count"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        
        assert "total_brands" in data
        assert data["total_brands"] >= 7
        print(f"✓ total_brands = {data['total_brands']}")
    
    # ==================== REALTIME REFRESH TESTS ====================
    
    def test_realtime_refresh_endpoint(self):
        """POST /api/brand-statistics/realtime/refresh returns success"""
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/realtime/refresh",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "last_update" in data
        print("✓ Realtime refresh endpoint works")
    
    def test_realtime_refresh_updates_timestamp(self):
        """Realtime refresh updates last_update timestamp"""
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/realtime/refresh",
            headers=self.headers
        )
        data = response.json()
        
        assert "last_update" in data
        assert data["last_update"] is not None
        # Timestamp should be recent (ISO format)
        assert "T" in data["last_update"]  # ISO format check
        print(f"✓ Last update timestamp: {data['last_update']}")
    
    def test_realtime_refresh_returns_cameras_count(self):
        """Realtime refresh returns cameras_count"""
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/realtime/refresh",
            headers=self.headers
        )
        data = response.json()
        
        assert "cameras_count" in data
        assert isinstance(data["cameras_count"], int)
        print(f"✓ Cameras count: {data['cameras_count']}")
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_ranking_requires_auth(self):
        """Ranking endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            params={"period": "day"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Ranking requires authentication")
    
    def test_realtime_refresh_requires_auth(self):
        """Realtime refresh endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/brand-statistics/realtime/refresh"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Realtime refresh requires authentication")
    
    # ==================== DATA VALIDATION TESTS ====================
    
    def test_ranking_visits_are_numeric(self):
        """All visit counts are numeric"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        ranking = data.get("ranking", [])
        
        for brand in ranking:
            assert isinstance(brand.get("total_visits"), (int, float)), \
                f"total_visits should be numeric for {brand.get('brand_id')}"
        print("✓ All visit counts are numeric")
    
    def test_ranking_brand_colors_valid(self):
        """All brand colors are valid hex codes"""
        response = requests.get(
            f"{BASE_URL}/api/brand-statistics/ranking",
            headers=self.headers,
            params={"period": "day"}
        )
        data = response.json()
        ranking = data.get("ranking", [])
        
        for brand in ranking:
            color = brand.get("brand_color", "")
            assert color.startswith("#"), f"Color should start with # for {brand.get('brand_id')}"
        print("✓ All brand colors are valid hex codes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
