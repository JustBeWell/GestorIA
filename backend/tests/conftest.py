import pytest


@pytest.fixture(autouse=True)
def isolate_auth_side_effects(monkeypatch):
    import services.auth_service as auth_service
    import routes.auth as auth_routes

    monkeypatch.setattr(auth_service.TokenService, "is_token_revoked", staticmethod(lambda token: False))
    monkeypatch.setattr(auth_service.TokenService, "revoke_token", staticmethod(lambda token, user_id, expires_at: None))
    monkeypatch.setattr(auth_service, "_enrich_user_role", lambda token_data: token_data)
    monkeypatch.setattr(auth_routes.TwoFactorService, "is_configured", staticmethod(lambda: False))
