"""Database connection utilities for user-service (PostgreSQL)."""

from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extensions import connection as PGConnection

from service_config import settings


def get_db_connection() -> PGConnection:
	"""Create a PostgreSQL connection using environment configuration."""
	return psycopg2.connect(settings.effective_database_url)


@contextmanager
def db_connection() -> Generator[PGConnection, None, None]:
	"""Context manager that opens and closes PostgreSQL connection."""
	connection = get_db_connection()
	try:
		yield connection
	finally:
		connection.close()


def check_database_connection() -> tuple[bool, str | None]:
	"""Validate PostgreSQL connectivity for health checks."""
	try:
		with db_connection() as connection:
			with connection.cursor() as cursor:
				cursor.execute("SELECT 1")
				cursor.fetchone()
		return True, None
	except Exception as exc:
		return False, str(exc)
