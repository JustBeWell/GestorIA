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

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.update_mfa")
	def test_update_my_mfa(self, mock_update_mfa, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="11111111-1111-1111-1111-111111111111",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		mock_update_mfa.return_value = {
			"id": "emp-1",
			"usuario_id": "11111111-1111-1111-1111-111111111111",
			"email": "empleado@gestoria.local",
			"nombre": "Empleado",
			"apellidos": "Prueba",
			"nif": "12345678A",
			"rol": "empleado",
			"activo": True,
			"mfa_habilitado": True,
		}

		response = client.patch(
			"/users/me/mfa",
			json={"mfa_habilitado": True},
			headers={"Authorization": "Bearer valid-token"},
		)

		assert response.status_code == 200
		assert response.json()["mfa_habilitado"] is True
		mock_update_mfa.assert_called_once_with("11111111-1111-1111-1111-111111111111", True)

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.get_company_config")
	def test_get_company_config(self, mock_get_config, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)
		mock_get_config.return_value = {
			"nombre_fiscal": "GestorIA",
			"cif_nif": "B00000000",
			"email": "info@gestoria.example",
			"telefono": None,
			"direccion": None,
			"codigo_postal": None,
			"ciudad": None,
			"provincia": None,
			"web": None,
			"updated_at": None,
		}

		response = client.get(
			"/users/company-config",
			headers={"Authorization": "Bearer valid-token"},
		)

		assert response.status_code == 200
		assert response.json()["cif_nif"] == "B00000000"

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.update_company_config")
	def test_update_company_config_requires_admin(self, mock_update_config, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="empleado@gestoria.local",
			role="empleado",
		)

		response = client.put(
			"/users/company-config",
			headers={"Authorization": "Bearer valid-token"},
			json={
				"nombre_fiscal": "GestorIA",
				"cif_nif": "B00000000",
			},
		)

		assert response.status_code == 403
		mock_update_config.assert_not_called()

	@patch("services.auth_service.TokenService.decode_token")
	@patch("routes.users.UserService.update_company_config")
	def test_update_company_config_as_admin(self, mock_update_config, mock_decode):
		mock_decode.return_value = TokenData(
			user_id="local-user",
			nombre_usuario="admin@gestoria.local",
			role="administrador",
		)
		mock_update_config.return_value = {
			"nombre_fiscal": "GestorIA Actualizada",
			"cif_nif": "B00000000",
			"email": "info@gestoria.example",
			"telefono": "600000000",
			"direccion": "Calle Mayor 1",
			"codigo_postal": "28001",
			"ciudad": "Madrid",
			"provincia": "Madrid",
			"web": "https://gestoria.local",
			"updated_at": None,
		}

		response = client.put(
			"/users/company-config",
			headers={"Authorization": "Bearer valid-token"},
			json={
				"nombre_fiscal": "GestorIA Actualizada",
				"cif_nif": "B00000000",
				"email": "info@gestoria.example",
				"telefono": "600000000",
				"direccion": "Calle Mayor 1",
				"codigo_postal": "28001",
				"ciudad": "Madrid",
				"provincia": "Madrid",
				"web": "https://gestoria.local",
			},
		)

		assert response.status_code == 200
		assert response.json()["nombre_fiscal"] == "GestorIA Actualizada"
