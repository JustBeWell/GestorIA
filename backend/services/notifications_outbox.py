from __future__ import annotations

import threading
import time

from services.push_dispatcher_service import PushDispatcherService


class OutboxWorker:
    def __init__(self, interval_seconds: int = 15) -> None:
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, name="notifications-outbox", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                PushDispatcherService.deliver_pending()
            except Exception:
                pass
            self._stop.wait(self.interval_seconds)
