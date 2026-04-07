"""Comprehensive tests for user-service API."""

import sys
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, "..")

from main import app
from models import TokenData


client = TestClient(app)


class TestRootAndHealth:
	def test_root_endpoint(self):
		response = client.get("/")
		assert response.status_code == 200
		data = response.json()
		assert data["service"] == "User Service"
		assert data["status"] == "running"

	def test_health_endpoint(self):
		response = client.get("/health")
		assert response.status_code == 200
		assert response.json()["status"] == "healthy"


class TestAuthLogin:
	@patch("routes.auth.authenticate_user")
	@patch("routes.auth.TokenService.create_access_token")
	@patch("routes.auth.TokenService.get_expiration_seconds")
	def test_login_success(self, mock_exp, mock_create_token, mock_authenticate):
		mock_authenticate.return_value = TokenData(
			user_id="11111111-1111-1111-1111-111111111111",
			nombre_usuario="admin@gestoria.local",
			role="administrador",
		)
		mock_create_token.return_value = ("jwt-token", None)
		mock_exp.return_value = 86400

		response = client.post(
			"/auth/login",
			json={"dni": "12345678A", "password": "Password123!"},
		)

		assert response.status_code == 200
		body = response.json()
		assert body["access_token"] == "jwt-token"
		assert body["token_type"] == "bearer"
		assert body["expires_in"] == 86400
		assert body["user"]["role"] == "administrador"

	def test_login_validation_error_short_password(self):
		response = client.post(
			"/auth/login",
			json={"dni": "12345678A", "password": "123"},
		)
		assert response.status_code == 422


class TestAuthTokenAndLogout:
	def test_get_token_without_authorization(self):
		response = client.get("/auth/token")
		assert response.status_code == 401

	def test_get_token_invalid_format(self):
		response = client.get(
			"/auth/token",
			headers={"Authorization": "Token abc"},
		)
		assert response.status_code == 401

	@patch("services.auth_service.TokenService.decode_token")
	def test_get_token_success(self, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		response = client.get(
			"/auth/token",
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 200
		assert "access_token" in response.json()

	def test_logout_requires_auth(self):
		response = client.post("/auth/logout")
		assert response.status_code == 401

	@patch("services.auth_service.TokenService.decode_token")
	def test_logout_success(self, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		response = client.post(
			"/auth/logout",
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 200

class TestUsersRoutes:
	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.list_users")
	def test_list_users_success(self, mock_list_users, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="admin@gestoria.local",
			role="administrador",
		)
		mock_list_users.return_value = [{"id": "1", "nombre": "Test"}]

		response = client.get(
			"/users/",
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 200
		assert isinstance(response.json(), list)

	def test_get_me_requires_auth(self):
		response = client.get("/users/me")
		assert response.status_code == 401

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.get")
	def test_get_me_found(self, mock_get, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		mock_get.return_value = {
			"id": "emp-1",
			"usuario_id": "11111111-1111-1111-1111-111111111111",
			"email": "empleado@gestoria.local",
			"nombre": "Empleado",
			"apellidos": "Prueba",
			"nif": "12345678A",
			"rol": "empleado",
			"activo": True,
		}

		response = client.get(
			"/users/me",
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 200
		assert response.json()["email"] == "empleado@gestoria.local"

	@patch("routes.users.UserService.exists")
	@patch("services.auth_service.TokenService.decode_token")
	def test_exists_endpoint(self, mock_decode, mock_exists):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="admin@gestoria.local",
			role="administrador",
		)
		mock_exists.return_value = True
		response = client.get(
			"/users/11111111-1111-1111-1111-111111111111/exists",
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 200
		assert response.json()["exists"] is True

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.create")
	def test_create_user_requires_admin(self, mock_create, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		response = client.post(
			"/users/",
			json={
				"nombre_usuario": "nuevo@gestoria.com",
				"password": "Password123!",
				"rol": "empleado",
				"nombre": "Nuevo",
				"apellidos": "Usuario",
				"nif": "12345678Z",
			},
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 403
		mock_create.assert_not_called()

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.create")
	def test_create_user_as_admin(self, mock_create, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="admin@gestoria.local",
			role="administrador",
		)
		mock_create.return_value = {"id": "emp-1", "email": "nuevo@gestoria.com"}
		response = client.post(
			"/users/",
			json={
				"nombre_usuario": "nuevo@gestoria.com",
				"password": "Password123!",
				"rol": "empleado",
				"nombre": "Nuevo",
				"apellidos": "Usuario",
				"nif": "12345678Z",
			},
			headers={"Authorization": "Bearer valid-token"},
		)
		assert response.status_code == 201
		assert response.json()["email"] == "nuevo@gestoria.com"
