#!/usr/bin/env python3
"""
Siempria Network Monitor - Backend API Testing
Tests all API endpoints for authentication, devices, groups, users, and settings
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SiempriaAPITester:
    def __init__(self, base_url: str = "https://monitor-fixes.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, use_auth: bool = True) -> tuple[bool, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"
                
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
                
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, f"Request error: {str(e)}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.make_request('GET', '/', use_auth=False)
        expected_message = "Siempria Network Monitor API v2.0"
        
        if success and response.get('message') == expected_message:
            self.log_result("Root API Endpoint", True, f"API version: {response.get('message')}")
        else:
            self.log_result("Root API Endpoint", False, "API not responding correctly", response)

    def test_login(self, username: str = "admin", password: str = "admin123"):
        """Test user authentication"""
        login_data = {"username": username, "password": password}
        success, response = self.make_request('POST', '/auth/login', login_data, use_auth=False)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            user_info = response.get('user', {})
            self.log_result("Admin Login", True, 
                          f"User: {user_info.get('username')}, Role: {user_info.get('role')}")
            return True
        else:
            self.log_result("Admin Login", False, "Login failed", response)
            return False

    def test_auth_me(self):
        """Test current user endpoint"""
        success, response = self.make_request('GET', '/auth/me')
        
        if success and 'username' in response:
            self.log_result("Get Current User", True, 
                          f"User: {response.get('username')}, Role: {response.get('role')}")
        else:
            self.log_result("Get Current User", False, "Failed to get user info", response)

    def test_get_devices(self):
        """Test get devices endpoint"""
        success, response = self.make_request('GET', '/devices')
        
        if success and 'devices' in response:
            devices = response['devices']
            self.log_result("Get Devices", True, f"Found {len(devices)} devices")
            return devices
        else:
            self.log_result("Get Devices", False, "Failed to get devices", response)
            return []

    def test_create_device(self):
        """Test device creation"""
        device_data = {
            "name": "Test Server",
            "ip_address": "8.8.8.8",
            "port": 53,
            "description": "Google DNS Server for testing"
        }
        
        success, response = self.make_request('POST', '/devices', device_data, expected_status=200)
        
        if success and response.get('message') == 'Dispositivo creado':
            device = response.get('device', {})
            device_id = device.get('id')
            self.log_result("Create Device", True, f"Device created with ID: {device_id}")
            return device_id
        else:
            self.log_result("Create Device", False, "Failed to create device", response)
            return None

    def test_device_check(self, device_id: str):
        """Test manual device verification"""
        success, response = self.make_request('POST', f'/devices/{device_id}/check')
        
        if success and 'result' in response:
            result = response['result']
            status = result.get('status', 'unknown')
            self.log_result("Manual Device Check", True, 
                          f"Device status: {status}, Ping: {result.get('ping_success')}, Port: {result.get('port_success')}")
        else:
            self.log_result("Manual Device Check", False, "Failed to check device", response)

    def test_get_groups(self):
        """Test get groups endpoint"""
        success, response = self.make_request('GET', '/groups')
        
        if success and 'groups' in response:
            groups = response['groups']
            self.log_result("Get Groups", True, f"Found {len(groups)} groups")
            return groups
        else:
            self.log_result("Get Groups", False, "Failed to get groups", response)
            return []

    def test_create_group(self):
        """Test group creation"""
        group_data = {
            "name": "Test Group",
            "description": "Test group for automated testing",
            "color": "#22c55e"
        }
        
        success, response = self.make_request('POST', '/groups', group_data)
        
        if success and response.get('message') == 'Grupo creado':
            group = response.get('group', {})
            group_id = group.get('id')
            self.log_result("Create Group", True, f"Group created with ID: {group_id}")
            return group_id
        else:
            self.log_result("Create Group", False, "Failed to create group", response)
            return None

    def test_get_users(self):
        """Test get users endpoint (admin only)"""
        success, response = self.make_request('GET', '/users')
        
        if success and 'users' in response:
            users = response['users']
            self.log_result("Get Users", True, f"Found {len(users)} users")
            return users
        else:
            self.log_result("Get Users", False, "Failed to get users", response)
            return []

    def test_create_user(self):
        """Test user creation (admin only)"""
        user_data = {
            "username": "testviewer",
            "email": "testviewer@siempria.com",
            "password": "testpass123",
            "role": "viewer",
            "full_name": "Test Viewer User"
        }
        
        success, response = self.make_request('POST', '/users', user_data)
        
        if success and response.get('message') == 'Usuario creado':
            user = response.get('user', {})
            user_id = user.get('id')
            self.log_result("Create User", True, f"User created with ID: {user_id}")
            return user_id
        else:
            self.log_result("Create User", False, "Failed to create user", response)
            return None

    def test_get_alerts(self):
        """Test get alerts endpoint"""
        success, response = self.make_request('GET', '/alerts')
        
        if success and 'alerts' in response:
            alerts = response['alerts']
            self.log_result("Get Alerts", True, f"Found {len(alerts)} alerts")
        else:
            self.log_result("Get Alerts", False, "Failed to get alerts", response)

    def test_get_settings(self):
        """Test get settings endpoint (admin only)"""
        success, response = self.make_request('GET', '/settings')
        
        if success:
            settings = response.get('settings')
            self.log_result("Get Settings", True, "Settings retrieved successfully")
        else:
            self.log_result("Get Settings", False, "Failed to get settings", response)

    def test_device_history(self, device_id: str):
        """Test device history endpoint"""
        success, response = self.make_request('GET', f'/devices/{device_id}/history')
        
        if success and 'history' in response:
            history = response['history']
            self.log_result("Get Device History", True, f"Found {len(history)} history entries")
        else:
            self.log_result("Get Device History", False, "Failed to get device history", response)

    def test_check_all_devices(self):
        """Test check all devices endpoint"""
        success, response = self.make_request('POST', '/devices/check-all')
        
        if success and 'message' in response:
            self.log_result("Check All Devices", True, response['message'])
        else:
            self.log_result("Check All Devices", False, "Failed to check all devices", response)

    def cleanup_test_data(self, device_id: str = None, group_id: str = None, user_id: str = None):
        """Clean up test data"""
        print("🧹 Cleaning up test data...")
        
        if device_id:
            success, _ = self.make_request('DELETE', f'/devices/{device_id}')
            print(f"   Device cleanup: {'✅' if success else '❌'}")
            
        if group_id:
            success, _ = self.make_request('DELETE', f'/groups/{group_id}')
            print(f"   Group cleanup: {'✅' if success else '❌'}")
            
        if user_id:
            success, _ = self.make_request('DELETE', f'/users/{user_id}')
            print(f"   User cleanup: {'✅' if success else '❌'}")

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting Siempria Network Monitor API Tests")
        print(f"📡 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Test API availability
        self.test_root_endpoint()
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False
            
        self.test_auth_me()
        
        # Test device operations
        devices = self.test_get_devices()
        device_id = self.test_create_device()
        
        if device_id:
            self.test_device_check(device_id)
            self.test_device_history(device_id)
        
        # Test group operations
        groups = self.test_get_groups()
        group_id = self.test_create_group()
        
        # Test user operations (admin only)
        users = self.test_get_users()
        user_id = self.test_create_user()
        
        # Test other endpoints
        self.test_get_alerts()
        self.test_get_settings()
        self.test_check_all_devices()
        
        # Cleanup
        self.cleanup_test_data(device_id, group_id, user_id)
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed - check details above")
            return False

def main():
    """Main test execution"""
    tester = SiempriaAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results_file = "/app/test_reports/backend_test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                "test_results": tester.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())