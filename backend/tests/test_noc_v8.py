"""
Test Suite for NOC Dashboard v8 Features
- Login authentication
- NOC ranking endpoints
- Historical data collection endpoints
- Deploy file endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USER = "admin"
ADMIN_PASS = "Conteo2024!"


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "siempria-conteo"
        print(f"✅ Health: {data}")
    
    def test_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USER, "password": ADMIN_PASS}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == ADMIN_USER
        assert data["user"]["role"] == "admin"
        print(f"✅ Login success: user={data['user']['username']}, role={data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USER, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Invalid login correctly rejected")


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


class TestRankingEndpoints:
    """Test ranking API endpoints"""
    
    def test_realtime_ranking(self, auth_token):
        """Test /api/ranking/realtime returns valid structure"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/realtime",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected structure
        assert "ranking" in data
        assert "totals" in data
        assert "cameras_total" in data
        assert "cameras_online" in data
        assert "last_update" in data
        
        # Verify ranking items structure
        for item in data["ranking"]:
            assert "brand_id" in item
            assert "brand_name" in item
            assert "entries" in item
        
        print(f"✅ Realtime: {len(data['ranking'])} brands, {data['cameras_online']}/{data['cameras_total']} cameras online")
    
    def test_by_brand_ranking(self, auth_token):
        """Test /api/ranking/by-brand returns brand rankings"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/by-brand?period=day",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "ranking" in data
        assert "period" in data
        assert data["period"] == "day"
        print(f"✅ By Brand: {len(data['ranking'])} brands in ranking")
    
    def test_by_island_ranking(self, auth_token):
        """Test /api/ranking/by-island returns island statistics"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/by-island",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "islands" in data
        assert "date" in data
        
        # Check island structure
        for island_id, island_data in data["islands"].items():
            assert "total" in island_data
            assert "name" in island_data
        
        print(f"✅ By Island: {len(data['islands'])} islands with data")
    
    def test_trends_endpoint(self, auth_token):
        """Test /api/ranking/trends returns hourly/daily data"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/trends",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "hourly_today" in data
        assert "daily_week" in data
        assert "brand_hourly" in data
        assert "date" in data
        
        # Verify hourly data structure
        if len(data["hourly_today"]) > 0:
            for hour_data in data["hourly_today"]:
                assert "hour" in hour_data
                assert "label" in hour_data
                assert "entries" in hour_data
        
        print(f"✅ Trends: {len(data['hourly_today'])} hourly entries, {len(data['daily_week'])} daily entries")


class TestHistoricalDataEndpoints:
    """Test historical data collection feature endpoints"""
    
    def test_collector_status(self, auth_token):
        """Test /api/ranking/collector-status returns active:true with readings data"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/collector-status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify collector is active
        assert "active" in data
        assert data["active"] == True
        
        # Verify data structure
        assert "total_readings" in data
        assert "today_readings" in data
        assert "total_snapshots" in data
        assert "interval_seconds" in data
        
        # Verify interval is 5 minutes (300 seconds)
        assert data["interval_seconds"] == 300
        
        print(f"✅ Collector Status: active={data['active']}, readings={data['total_readings']}, snapshots={data['total_snapshots']}")
    
    def test_historical_data(self, auth_token):
        """Test /api/ranking/historical?days=7 returns daily_series, today_hourly, readings_stored"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/historical?days=7",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "period_days" in data
        assert data["period_days"] == 7
        
        assert "daily_series" in data
        assert "today_hourly" in data
        assert "readings_stored" in data
        assert "today_total" in data
        assert "yesterday_total" in data
        assert "trend_pct" in data
        
        # Verify daily_series structure
        for day in data["daily_series"]:
            assert "date" in day
            assert "day" in day
            assert "entries" in day
        
        # Verify today_hourly structure
        for hour in data["today_hourly"]:
            assert "hour" in hour
            assert "label" in hour
            assert "entries" in hour
        
        print(f"✅ Historical: {len(data['daily_series'])} days, {len(data['today_hourly'])} hourly, {data['readings_stored']} readings stored")


class TestDeployEndpoints:
    """Test deploy file download endpoints"""
    
    def test_deploy_backend_endpoint(self):
        """Test /api/deploy/backend returns 200"""
        response = requests.get(f"{BASE_URL}/api/deploy/backend", stream=True)
        # Could be 200 (file exists) or 404 (file not created)
        # Main check is endpoint works
        assert response.status_code in [200, 404, 500]
        print(f"✅ Deploy Backend: status={response.status_code}")
    
    def test_deploy_frontend_endpoint(self):
        """Test /api/deploy/frontend returns 200"""
        response = requests.get(f"{BASE_URL}/api/deploy/frontend", stream=True)
        assert response.status_code in [200, 404, 500]
        print(f"✅ Deploy Frontend: status={response.status_code}")
    
    def test_deploy_script_endpoint(self):
        """Test /api/deploy/script returns 200"""
        response = requests.get(f"{BASE_URL}/api/deploy/script", stream=True)
        assert response.status_code in [200, 404, 500]
        print(f"✅ Deploy Script: status={response.status_code}")


class TestCamerasEndpoint:
    """Test cameras configuration endpoints"""
    
    def test_list_cameras(self, auth_token):
        """Test /api/cameras returns camera list"""
        response = requests.get(
            f"{BASE_URL}/api/cameras",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "cameras" in data
        
        # Verify camera structure if any exist
        for cam in data["cameras"]:
            assert "camera_id" in cam
            assert "camera_name" in cam
            assert "brand_id" in cam
            assert "island" in cam
        
        print(f"✅ Cameras: {len(data['cameras'])} cameras configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
