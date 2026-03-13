"""
Test Suite for BI Features - Executive Dashboard, Goals CRUD, Export, Presentation Mode
Siempria Conteo Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://conteo-bi.preview.emergentagent.com')


class TestAuthFlow:
    """Authentication tests"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("PASS: Health check OK")
    
    def test_login_valid_credentials(self):
        """Test login with admin/Conteo2024!"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "Conteo2024!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
        print(f"PASS: Login successful, token obtained")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "WrongPassword!"}
        )
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected with 401")


@pytest.fixture(scope="class")
def auth_token():
    """Get auth token for subsequent tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "Conteo2024!"}
    )
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed")


class TestExecutiveEndpoint:
    """Executive Dashboard API tests"""
    
    def test_executive_endpoint(self, auth_token):
        """GET /api/analytics/executive - verify KPIs returned"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/executive",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        required_fields = ["today_total", "yesterday_total", "month_total", "daily_avg", 
                          "cameras_total", "cameras_online", "goals_progress", "month"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(data["today_total"], int)
        assert isinstance(data["month_total"], int)
        assert isinstance(data["goals_progress"], list)
        
        print(f"PASS: Executive KPIs returned - today={data['today_total']}, month={data['month_total']}")


class TestComparisonEndpoint:
    """Temporal Comparison API tests"""
    
    def test_comparison_week(self, auth_token):
        """GET /api/analytics/comparison?period=week"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/comparison?period=week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "week"
        assert "current_total" in data
        assert "previous_total" in data
        assert "label_current" in data
        assert "label_previous" in data
        assert "brand_comparison" in data
        
        print(f"PASS: Week comparison - current={data['current_total']}, previous={data['previous_total']}")
    
    def test_comparison_month(self, auth_token):
        """GET /api/analytics/comparison?period=month"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/comparison?period=month",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "month"
        assert "current_total" in data
        assert "previous_total" in data
        
        print(f"PASS: Month comparison - current={data['current_total']}, previous={data['previous_total']}")


class TestGoalsCRUD:
    """Goals CRUD API tests"""
    
    def test_get_goals(self, auth_token):
        """GET /api/goals - list goals"""
        response = requests.get(
            f"{BASE_URL}/api/goals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "goals" in data
        assert "month" in data
        assert isinstance(data["goals"], list)
        
        print(f"PASS: Goals list returned - {len(data['goals'])} goals for {data['month']}")
    
    def test_create_goal(self, auth_token):
        """POST /api/goals - create a new goal"""
        response = requests.post(
            f"{BASE_URL}/api/goals",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "brand_id": "TEST_skoda",
                "month": "2026-03",
                "target_visits": 2000,
                "label": "TEST Goal for Skoda"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "goal_id" in data
        assert "message" in data
        
        print(f"PASS: Goal created - goal_id={data['goal_id']}")
        return data["goal_id"]
    
    def test_update_goal(self, auth_token):
        """POST /api/goals - update existing goal (upsert)"""
        response = requests.post(
            f"{BASE_URL}/api/goals",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "brand_id": "TEST_skoda",
                "month": "2026-03",
                "target_visits": 2500,
                "label": "Updated TEST Goal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify it was updated (not created new)
        assert data.get("message") == "Objetivo actualizado"
        
        print(f"PASS: Goal updated - goal_id={data['goal_id']}")
    
    def test_verify_goal_update(self, auth_token):
        """Verify goal was actually updated"""
        response = requests.get(
            f"{BASE_URL}/api/goals?month=2026-03",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        skoda_goal = next((g for g in data["goals"] if g["brand_id"] == "TEST_skoda"), None)
        if skoda_goal:
            assert skoda_goal["target_visits"] == 2500
            assert skoda_goal["label"] == "Updated TEST Goal"
            print(f"PASS: Goal verified - target={skoda_goal['target_visits']}, label={skoda_goal['label']}")
        else:
            pytest.skip("Skoda goal not found - may have been cleaned up")
    
    def test_delete_goal(self, auth_token):
        """DELETE /api/goals/{goal_id} - delete goal"""
        # First get the goal id
        response = requests.get(
            f"{BASE_URL}/api/goals?month=2026-03",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        skoda_goal = next((g for g in data["goals"] if g["brand_id"] == "TEST_skoda"), None)
        if not skoda_goal:
            pytest.skip("Test goal not found")
        
        goal_id = skoda_goal["goal_id"]
        
        # Delete the goal
        response = requests.delete(
            f"{BASE_URL}/api/goals/{goal_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted") == True
        
        print(f"PASS: Goal deleted - goal_id={goal_id}")
    
    def test_verify_goal_deletion(self, auth_token):
        """Verify goal was actually deleted"""
        response = requests.get(
            f"{BASE_URL}/api/goals?month=2026-03",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        skoda_goal = next((g for g in data["goals"] if g["brand_id"] == "TEST_skoda"), None)
        assert skoda_goal is None, "Goal should have been deleted"
        
        print("PASS: Goal deletion verified - no longer in database")


class TestExportEndpoint:
    """Export endpoint tests"""
    
    def test_export_requires_dates(self, auth_token):
        """Export requires from_date and to_date"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should fail without dates
        assert response.status_code == 422
        print("PASS: Export endpoint requires dates (422 without params)")
    
    def test_export_with_dates(self, auth_token):
        """Export with valid date range"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?from_date=2026-03-01&to_date=2026-03-12",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Verify CSV header
        content = response.text
        assert "Fecha" in content or "fecha" in content.lower()
        
        print("PASS: Export CSV returned with valid dates")
    
    def test_export_with_brand_filter(self, auth_token):
        """Export with brand filter"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?from_date=2026-03-01&to_date=2026-03-12&brand_id=audi",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("PASS: Export with brand filter returned CSV")
    
    def test_export_with_island_filter(self, auth_token):
        """Export with island filter"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/export?from_date=2026-03-01&to_date=2026-03-12&island=lanzarote",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("PASS: Export with island filter returned CSV")


class TestRankingEndpoint:
    """Ranking API tests (used by Presentation Mode)"""
    
    def test_ranking_realtime(self, auth_token):
        """GET /api/ranking/realtime"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/realtime",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "ranking" in data
        assert "totals" in data
        
        print(f"PASS: Realtime ranking - {len(data['ranking'])} brands")
    
    def test_ranking_trends(self, auth_token):
        """GET /api/ranking/trends"""
        response = requests.get(
            f"{BASE_URL}/api/ranking/trends",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "hourly_today" in data
        
        print(f"PASS: Trends data returned - {len(data.get('hourly_today', []))} hourly entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
