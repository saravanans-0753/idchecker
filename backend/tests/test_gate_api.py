"""
Backend API tests for Gate ID Check system
Tests: Residents CRUD, Access Logs, Sync endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["status"] == "online"


class TestResidentsEndpoints:
    """Test resident CRUD operations"""
    
    def test_get_all_residents(self, api_client):
        """Test GET /api/residents returns seeded data"""
        response = api_client.get(f"{BASE_URL}/api/residents")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5, "Should have at least 5 seeded residents"
        
        # Verify structure of first resident
        resident = data[0]
        assert "id" in resident
        assert "name" in resident
        assert "unit" in resident
        assert "phone" in resident
        assert "status" in resident
        assert "_id" not in resident, "MongoDB _id should be excluded"
    
    def test_get_specific_resident_res001(self, api_client):
        """Test GET /api/residents/RES001 returns Rajesh Kumar"""
        response = api_client.get(f"{BASE_URL}/api/residents/RES001")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "RES001"
        assert data["name"] == "Rajesh Kumar"
        assert data["unit"] == "A-101"
        assert data["phone"] == "+91 98765 43210"
        assert data["vehicle_plate"] == "KA 01 AB 1234"
        assert data["status"] == "active"
        assert "_id" not in data
    
    def test_get_nonexistent_resident(self, api_client):
        """Test GET /api/residents/INVALID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/residents/INVALID999")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_create_resident_and_verify(self, api_client):
        """Test POST /api/residents creates new resident and verify persistence"""
        new_resident = {
            "name": "TEST_John Doe",
            "unit": "Z-999",
            "phone": "+91 99999 99999",
            "vehicle_plate": "TEST KA 99 ZZ 9999",
            "status": "active"
        }
        
        # Create resident
        response = api_client.post(f"{BASE_URL}/api/residents", json=new_resident)
        assert response.status_code == 200
        
        created = response.json()
        assert created["name"] == new_resident["name"]
        assert created["unit"] == new_resident["unit"]
        assert "id" in created
        resident_id = created["id"]
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/residents/{resident_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == new_resident["name"]
        assert fetched["unit"] == new_resident["unit"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/residents/{resident_id}")
    
    def test_update_resident(self, api_client):
        """Test PUT /api/residents/{id} updates resident"""
        # First create a test resident
        new_resident = {
            "name": "TEST_Update User",
            "unit": "U-001",
            "phone": "+91 88888 88888",
            "status": "active"
        }
        create_response = api_client.post(f"{BASE_URL}/api/residents", json=new_resident)
        assert create_response.status_code == 200
        resident_id = create_response.json()["id"]
        
        # Update the resident
        update_data = {
            "phone": "+91 77777 77777",
            "vehicle_plate": "KA 77 XX 7777"
        }
        update_response = api_client.put(f"{BASE_URL}/api/residents/{resident_id}", json=update_data)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["phone"] == update_data["phone"]
        assert updated["vehicle_plate"] == update_data["vehicle_plate"]
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/residents/{resident_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["phone"] == update_data["phone"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/residents/{resident_id}")
    
    def test_delete_resident(self, api_client):
        """Test DELETE /api/residents/{id} removes resident"""
        # Create test resident
        new_resident = {
            "name": "TEST_Delete User",
            "unit": "D-001",
            "phone": "+91 66666 66666",
            "status": "active"
        }
        create_response = api_client.post(f"{BASE_URL}/api/residents", json=new_resident)
        assert create_response.status_code == 200
        resident_id = create_response.json()["id"]
        
        # Delete resident
        delete_response = api_client.delete(f"{BASE_URL}/api/residents/{resident_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion with GET (should return 404)
        get_response = api_client.get(f"{BASE_URL}/api/residents/{resident_id}")
        assert get_response.status_code == 404


class TestSyncEndpoint:
    """Test sync endpoint"""
    
    def test_sync_returns_all_residents(self, api_client):
        """Test GET /api/sync returns all residents with count"""
        response = api_client.get(f"{BASE_URL}/api/sync")
        assert response.status_code == 200
        
        data = response.json()
        assert "residents" in data
        assert "count" in data
        assert "synced_at" in data
        
        assert isinstance(data["residents"], list)
        assert data["count"] == len(data["residents"])
        assert data["count"] >= 5, "Should have at least 5 residents"
        
        # Verify resident structure
        if len(data["residents"]) > 0:
            resident = data["residents"][0]
            assert "id" in resident
            assert "name" in resident
            assert "_id" not in resident


class TestAccessLogs:
    """Test access log endpoints"""
    
    def test_create_access_log(self, api_client):
        """Test POST /api/access-logs creates log entry"""
        log_data = {
            "resident_id": "RES001",
            "resident_name": "Rajesh Kumar",
            "unit": "A-101",
            "status": "verified"
        }
        
        response = api_client.post(f"{BASE_URL}/api/access-logs", json=log_data)
        assert response.status_code == 200
        
        created = response.json()
        assert created["resident_id"] == log_data["resident_id"]
        assert created["resident_name"] == log_data["resident_name"]
        assert created["unit"] == log_data["unit"]
        assert created["status"] == log_data["status"]
        assert "id" in created
        assert "timestamp" in created
        assert "_id" not in created
    
    def test_get_access_logs(self, api_client):
        """Test GET /api/access-logs returns log entries"""
        # First create a log entry
        log_data = {
            "resident_id": "RES002",
            "resident_name": "Priya Sharma",
            "unit": "B-205",
            "status": "verified"
        }
        api_client.post(f"{BASE_URL}/api/access-logs", json=log_data)
        
        # Get all logs
        response = api_client.get(f"{BASE_URL}/api/access-logs")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one log entry"
        
        # Verify structure
        log = data[0]
        assert "id" in log
        assert "resident_id" in log
        assert "resident_name" in log
        assert "unit" in log
        assert "timestamp" in log
        assert "status" in log
        assert "_id" not in log
