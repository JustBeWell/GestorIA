from dataclasses import dataclass
import os

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class ServiceSettings:

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
	openai_gia_model: str = os.getenv("OPENAI_GIA_MODEL", "gpt-4o-mini")
	openai_image_model: str = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1")
	gia_storage_dir: str = os.getenv("GIA_STORAGE_DIR", os.path.join(os.getcwd(), "storage", "gia"))
	frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4200")

	twilio_account_sid: str | None = os.getenv("TWILIO_ACCOUNT_SID")
	twilio_auth_token: str | None = os.getenv("TWILIO_AUTH_TOKEN")
	twilio_from_number: str | None = os.getenv("TWILIO_FROM_NUMBER")
	push_vapid_public_key: str = os.getenv("PUSH_VAPID_PUBLIC_KEY", "")
	push_vapid_private_key: str = os.getenv("PUSH_VAPID_PRIVATE_KEY", "")
	push_vapid_subject: str = os.getenv("PUSH_VAPID_SUBJECT", "mailto:gestor@gestoria.es")
	internal_events_hmac_secret: str = os.getenv("INTERNAL_EVENTS_HMAC_SECRET", "dev-internal-events-secret")
	notifications_retention_days: int = int(os.getenv("NOTIFICATIONS_RETENTION_DAYS", "365"))
	task_deadline_days_ahead: str = os.getenv("TASK_DEADLINE_DAYS_AHEAD", "3,1")
	notif_outbox_batch_size: int = int(os.getenv("NOTIF_OUTBOX_BATCH_SIZE", "100"))
	notif_outbox_max_retries: int = int(os.getenv("NOTIF_OUTBOX_MAX_RETRIES", "5"))
	timezone: str = os.getenv("TIMEZONE", "Europe/Madrid")

	@property
	def effective_database_url(self) -> str:
		if self.database_url:
			return self.database_url

		return (
			f"postgresql://{self.postgres_user}:{self.postgres_password}"
			f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
			f"?sslmode={self.postgres_sslmode}"
		)


settings = ServiceSettings()
