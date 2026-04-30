"""
Service configuration for user-service.

Loads PostgreSQL settings from environment variables.
"""

from dataclasses import dataclass
import os

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class ServiceSettings:
	"""Environment-driven settings for the service."""

	postgres_host: str = os.getenv("POSTGRES_HOST")
	postgres_port: int = int(os.getenv("POSTGRES_PORT"))
	postgres_db: str = os.getenv("POSTGRES_DB")
	postgres_user: str = os.getenv("POSTGRES_USER")
	postgres_password: str = os.getenv("POSTGRES_PASSWORD")
	postgres_sslmode: str = os.getenv("POSTGRES_SSLMODE")
	database_url: str | None = os.getenv("DATABASE_URL")

	jwt_secret_key: str = os.getenv("JWT_SECRET_KEY")
	jwt_algorithm: str = os.getenv("JWT_ALGORITHM")
	jwt_expiration_hours: int = int(os.getenv("JWT_EXPIRATION_HOURS"))

	openai_api_key: str | None = os.getenv("OPENAI_API_KEY", None)
	frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4200")

	@property
	def effective_database_url(self) -> str:
		"""Get explicit DATABASE_URL or build one from PostgreSQL parts."""
		if self.database_url:
			return self.database_url

		return (
			f"postgresql://{self.postgres_user}:{self.postgres_password}"
			f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
			f"?sslmode={self.postgres_sslmode}"
		)


settings = ServiceSettings()
