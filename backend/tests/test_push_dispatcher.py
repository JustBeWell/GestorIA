from types import SimpleNamespace

from services.push_dispatcher_service import PushDispatcherService


class CursorSpy:
    def __init__(self):
        self.calls = []

    def execute(self, query, params=None):
        self.calls.append((query, params))


def test_schedule_retry_marks_dropped_at_max_retries(monkeypatch):
    cursor = CursorSpy()
    monkeypatch.setattr("services.push_dispatcher_service.settings", SimpleNamespace(notif_outbox_max_retries=2))

    PushDispatcherService._schedule_retry(cursor, {"intentos": 1, "outbox_id": "outbox-1"})

    query, params = cursor.calls[0]
    assert "estado = 'dropped'" in query
    assert params[0] == 2
    assert params[2] == "outbox-1"


def test_schedule_retry_sets_exponential_backoff(monkeypatch):
    cursor = CursorSpy()
    monkeypatch.setattr("services.push_dispatcher_service.settings", SimpleNamespace(notif_outbox_max_retries=5))

    PushDispatcherService._schedule_retry(cursor, {"intentos": 1, "outbox_id": "outbox-1"})

    query, params = cursor.calls[0]
    assert "next_attempt_at" in query
    assert params[0] == 2
    assert params[1] == "0:04:00"
