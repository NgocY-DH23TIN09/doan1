"""Core test suite for the DiabetesAI API."""

from copy import deepcopy
from datetime import UTC, datetime
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


def get_nested_value(document, path):
    value = document
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def matches_query(document, query):
    return all(get_nested_value(document, key) == value for key, value in query.items())


class FakeCursor:
    def __init__(self, documents):
        self.documents = [deepcopy(document) for document in documents]
        self._index = 0

    def sort(self, key, direction=-1):
        reverse = direction == -1
        self.documents.sort(key=lambda document: get_nested_value(document, key), reverse=reverse)
        return self

    def skip(self, amount):
        self.documents = self.documents[amount:]
        return self

    def limit(self, amount):
        self.documents = self.documents[:amount]
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self.documents):
            raise StopAsyncIteration
        value = self.documents[self._index]
        self._index += 1
        return deepcopy(value)


class FakeCollection:
    def __init__(self):
        self.documents = []

    async def find_one(self, query):
        for document in self.documents:
            if matches_query(document, query):
                return deepcopy(document)
        return None

    async def insert_one(self, document):
        stored = deepcopy(document)
        stored.setdefault("_id", ObjectId())
        self.documents.append(stored)
        return SimpleNamespace(inserted_id=stored["_id"])

    async def count_documents(self, query):
        return len([document for document in self.documents if matches_query(document, query)])

    def find(self, query=None):
        query = query or {}
        return FakeCursor([document for document in self.documents if matches_query(document, query)])

    async def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if matches_query(document, query):
                del self.documents[index]
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    def aggregate(self, pipeline):
        match_stage = next((stage.get("$match") for stage in pipeline if "$match" in stage), {})
        group_stage = next((stage.get("$group") for stage in pipeline if "$group" in stage), None)
        matched = [document for document in self.documents if matches_query(document, match_stage)]

        if not group_stage:
            return FakeCursor([])

        if group_stage.get("count") == {"$sum": 1}:
            group_key = group_stage["_id"].removeprefix("$")
            grouped = {}
            for document in matched:
                value = get_nested_value(document, group_key)
                grouped[value] = grouped.get(value, 0) + 1
            return FakeCursor([{"_id": key, "count": count} for key, count in grouped.items()])

        averages = {"_id": None}
        for target_key, expression in group_stage.items():
            if target_key == "_id":
                continue
            source_key = expression["$avg"].removeprefix("$")
            values = [get_nested_value(document, source_key) for document in matched]
            numeric_values = [value for value in values if isinstance(value, (int, float))]
            averages[target_key] = sum(numeric_values) / len(numeric_values) if numeric_values else 0.0
        return FakeCursor([averages] if matched else [])


class FakeDatabase:
    def __init__(self):
        self.collections = {"users": FakeCollection(), "predictions": FakeCollection()}

    def __getitem__(self, name):
        return self.collections[name]


@pytest.fixture()
def client(monkeypatch):
    fake_db = FakeDatabase()
    current_user_holder = {
        "user": {
            "_id": ObjectId(),
            "phone_number": "0999999999",
            "full_name": "Người dùng kiểm thử",
            "age": 29,
            "gender": "Nam",
            "role": UserRole.USER,
            "created_at": datetime.now(UTC),
        }
    }

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

    async def fake_current_user():
        return current_user_holder["user"]

    main.app.dependency_overrides[users_routes.get_current_user] = fake_current_user
    main.app.dependency_overrides[records_routes.get_current_user] = fake_current_user

    with TestClient(main.app) as test_client:
        test_client.fake_db = fake_db
        test_client.current_user_holder = current_user_holder
        yield test_client

    main.app.dependency_overrides.clear()

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


def test_save_and_list_records(client):
    """Test saving a prediction record and reading it back from history."""
    payload = {
        "patient_name": "Ẩn danh",
        "input_data": {
            "pregnancies": 1,
            "glucose": 132,
            "blood_pressure": 82,
            "skin_thickness": 24,
            "insulin": 88,
            "bmi": 27.4,
            "diabetes_pedigree": 0.63,
            "age": 41,
        },
        "patient_context": {
            "comorbidities": ["Tăng huyết áp"],
            "lifestyle_habits": ["Ít vận động"],
        },
        "prediction": {
            "risk_score": 0.64,
            "risk_level": "Cao",
            "risk_percentage": 64.0,
            "recommendation": "Khuyến nghị kiểm tra thêm.",
            "features_importance": {"Glucose": 0.41},
        },
    }

    save_response = client.post("/api/records", json=payload)
    assert save_response.status_code == 200
    assert "id" in save_response.json()

    stored_record = client.fake_db["predictions"].documents[0]
    assert stored_record["user_id"] == str(client.current_user_holder["user"]["_id"])
    assert stored_record["patient_name"] == client.current_user_holder["user"]["full_name"]

    list_response = client.get("/api/records")
    assert list_response.status_code == 200
    result = list_response.json()
    assert result["total"] == 1
    assert result["records"][0]["patient_context"]["comorbidities"] == ["Tăng huyết áp"]
    assert result["records"][0]["prediction"]["risk_level"] == "Cao"


def test_stats_only_count_current_user_records(client):
    """Test stats endpoint respects per-user filtering and aggregates correctly."""
    current_user_id = str(client.current_user_holder["user"]["_id"])
    other_user_id = str(ObjectId())
    predictions = client.fake_db["predictions"].documents

    predictions.extend([
        {
            "_id": ObjectId(),
            "user_id": current_user_id,
            "patient_name": "A",
            "input_data": {"age": 40, "bmi": 26.0, "glucose": 140},
            "patient_context": {"comorbidities": [], "lifestyle_habits": []},
            "prediction": {"risk_level": "Cao"},
            "created_at": datetime.now(UTC),
        },
        {
            "_id": ObjectId(),
            "user_id": current_user_id,
            "patient_name": "B",
            "input_data": {"age": 30, "bmi": 24.0, "glucose": 100},
            "patient_context": {"comorbidities": [], "lifestyle_habits": []},
            "prediction": {"risk_level": "Trung bình"},
            "created_at": datetime.now(UTC),
        },
        {
            "_id": ObjectId(),
            "user_id": other_user_id,
            "patient_name": "C",
            "input_data": {"age": 80, "bmi": 35.0, "glucose": 250},
            "patient_context": {"comorbidities": [], "lifestyle_habits": []},
            "prediction": {"risk_level": "Cao"},
            "created_at": datetime.now(UTC),
        },
    ])

    response = client.get("/api/stats")
    assert response.status_code == 200
    result = response.json()
    assert result["total_records"] == 2
    assert result["risk_distribution"]["Cao"] == 1
    assert result["risk_distribution"]["Trung bình"] == 1
    assert result["avg_age"] == 35.0
    assert result["avg_bmi"] == 25.0
    assert result["avg_glucose"] == 120.0
    assert result["high_risk_percentage"] == 50.0


def test_delete_record_removes_saved_entry(client):
    """Test deleting a record removes only the requested history item."""
    record_id = ObjectId()
    client.fake_db["predictions"].documents.append({
        "_id": record_id,
        "user_id": str(client.current_user_holder["user"]["_id"]),
        "patient_name": "Bệnh nhân kiểm thử",
        "input_data": {"age": 35, "bmi": 25.5, "glucose": 115},
        "patient_context": {"comorbidities": [], "lifestyle_habits": []},
        "prediction": {"risk_level": "Thấp"},
        "created_at": datetime.now(UTC),
    })

    response = client.delete(f"/api/records/{record_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Đã xóa bản ghi thành công!"
    assert client.fake_db["predictions"].documents == []


