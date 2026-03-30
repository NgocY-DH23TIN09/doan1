"""Core test suite for the DiabetesAI API."""

import os
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

import main
import routes.auth as auth_routes
import routes.predict as predict_routes
import routes.records as records_routes
import routes.users as users_routes
from models import UserRole


class FakeCollection:
    def __init__(self):
        self.documents = []

    async def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return dict(document)
        return None

    async def insert_one(self, document):
        stored = dict(document)
        stored.setdefault("_id", ObjectId())
        self.documents.append(stored)
        return SimpleNamespace(inserted_id=stored["_id"])


class FakeDatabase:
    def __init__(self):
        self.collections = {"users": FakeCollection(), "predictions": FakeCollection()}

    def __getitem__(self, name):
        return self.collections[name]


@pytest.fixture()
def client(monkeypatch):
    fake_db = FakeDatabase()

    monkeypatch.delenv("BOOTSTRAP_ADMIN_PHONE", raising=False)
    monkeypatch.delenv("BOOTSTRAP_ADMIN_PASSWORD", raising=False)

    async def fake_connect_to_mongo():
        return None

    async def fake_close_mongo_connection():
        return None

    monkeypatch.setattr(main, "connect_to_mongo", fake_connect_to_mongo)
    monkeypatch.setattr(main, "close_mongo_connection", fake_close_mongo_connection)
    monkeypatch.setattr(main, "get_database", lambda: fake_db)
    monkeypatch.setattr(auth_routes, "require_database", lambda: fake_db)
    monkeypatch.setattr(users_routes, "require_database", lambda: fake_db)
    monkeypatch.setattr(records_routes, "require_database", lambda: fake_db)
    monkeypatch.setattr(predict_routes, "api_key", None)

    with TestClient(main.app) as test_client:
        yield test_client

# Test 1: Health Check
def test_home(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200


# Test 2: Registration
def test_register_success(client):
    """Test user registration"""
    payload = {
        "phone_number": "0987654321",
        "full_name": "Nguyễn Văn A",
        "age": 25,
        "gender": "Nam",
        "password": "password123"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["phone_number"] == payload["phone_number"]
    assert result["role"] == UserRole.USER


# Test 3: Login
def test_login_registered_user(client):
    """Test login with freshly registered credentials"""
    register_payload = {
        "phone_number": "0123456789",
        "full_name": "System Administrator",
        "age": 30,
        "gender": "Nam",
        "password": "admin123"
    }
    client.post("/api/auth/register", json=register_payload)

    login_payload = {
        "phone_number": register_payload["phone_number"],
        "password": register_payload["password"]
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_health_status(client):
    """Test health endpoint returns service status"""
    response = client.get("/health")
    assert response.status_code == 200
    result = response.json()
    assert result["status"] in ["ok", "degraded"]
    assert result["services"]["database"] == "ok"
    assert result["services"]["model"] == "ok"


# Test 4: Prediction - Low Risk
def test_predict_low_risk(client):
    """Test prediction with low-risk data"""
    payload = {
        "pregnancies": 0,
        "glucose": 100,
        "blood_pressure": 70,
        "skin_thickness": 20,
        "insulin": 50,
        "bmi": 22.5,
        "diabetes_pedigree": 0.2,
        "age": 25
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "risk_score" in result
    assert "risk_level" in result


# Test 5: Prediction - High Risk
def test_predict_high_risk(client):
    """Test prediction with high-risk data"""
    payload = {
        "pregnancies": 5,
        "glucose": 250,
        "blood_pressure": 100,
        "skin_thickness": 35,
        "insulin": 200,
        "bmi": 35.0,
        "diabetes_pedigree": 0.8,
        "age": 55
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["risk_level"] in ["Thấp", "Trung bình", "Cao"]


# Test 6: Invalid Prediction Input
def test_predict_invalid(client):
    """Test prediction with invalid data"""
    payload = {
        "pregnancies": 0,
        "glucose": 500,  # Out of range
        "blood_pressure": 70,
        "skin_thickness": 20,
        "insulin": 50,
        "bmi": 22.5,
        "diabetes_pedigree": 0.2,
        "age": 25
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422


# Test 7: Feature Importance
def test_predict_features(client):
    """Test that all features have importance scores"""
    payload = {
        "pregnancies": 2,
        "glucose": 120,
        "blood_pressure": 70,
        "skin_thickness": 25,
        "insulin": 80,
        "bmi": 28.5,
        "diabetes_pedigree": 0.45,
        "age": 35
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "features_importance" in result
    assert len(result["features_importance"]) == 8


# Test 8: Error Handling
def test_nonexistent_endpoint(client):
    """Test non-existent endpoint"""
    response = client.get("/api/nonexistent")
    assert response.status_code == 404


