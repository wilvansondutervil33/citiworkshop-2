import os
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Locally these come from .env; on AWS Lambda, Terraform provides POSTGRES_* and SECRET_KEY instead
    database_url: str | None = None
    secret_key: str
    frontend_origin: str | None = None

    postgres_host: str | None = None
    postgres_port: str = "5432"
    postgres_name: str | None = None
    postgres_user: str | None = None
    postgres_pass: str | None = None

    # "outbox": store and log emails only (default). "ses": also send them through AWS SES.
    email_mode: str = "outbox"
    email_from: str = "facilities@acme.inc"

    model_config = SettingsConfigDict(env_file= ".env", extra="ignore")

    @property
    def is_lambda(self) -> bool:
        return bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        if not (self.postgres_host and self.postgres_name and self.postgres_user):
            raise RuntimeError("Set DATABASE_URL, or POSTGRES_HOST, POSTGRES_NAME, POSTGRES_USER and POSTGRES_PASS")
        return (
            f"postgresql+asyncpg://{quote_plus(self.postgres_user)}:{quote_plus(self.postgres_pass or '')}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_name}"
        )

settings = Settings()
