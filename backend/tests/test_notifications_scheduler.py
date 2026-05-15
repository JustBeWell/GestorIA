from types import SimpleNamespace

from services.notifications_scheduler import _deadline_days


def test_deadline_days_reads_settings(monkeypatch):
    monkeypatch.setattr("services.notifications_scheduler.settings", SimpleNamespace(task_deadline_days_ahead="5,2"))

    assert _deadline_days() == [5, 2]


def test_deadline_days_uses_default_when_empty(monkeypatch):
    monkeypatch.setattr("services.notifications_scheduler.settings", SimpleNamespace(task_deadline_days_ahead=""))

    assert _deadline_days() == [3, 1]
