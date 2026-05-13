from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extensions import connection as PGConnection

from service_config import settings


def get_db_connection() -> PGConnection:
	return psycopg2.connect(settings.effective_database_url)


@contextmanager
def db_connection() -> Generator[PGConnection, None, None]:
	connection = get_db_connection()
	try:
		yield connection
	finally:
		connection.close()


def check_database_connection() -> tuple[bool, str | None]:
	try:
		with db_connection() as connection:
			with connection.cursor() as cursor:
				cursor.execute("SELECT 1")
				cursor.fetchone()
		return True, None
	except Exception as exc:
		return False, str(exc)
