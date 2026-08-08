from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"

    # This service intentionally uses its own database and its own Google
    # OAuth client/user table — accounts are NOT shared with the Sweeps
    # backend, since Cover Letter Studio is expected to become a paid,
    # independently-billed product.
    database_url: str = (
        "postgresql+asyncpg://coverletters:coverletters@localhost:5433/coverletters"
    )

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8001/auth/google/callback"

    secret_key: str = "dev-secret-change-in-production"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    # Comma-separated; leave empty to allow any Google account to sign up
    allowed_emails: str = ""
    trusted_hosts: str = "localhost,127.0.0.1"

    jwt_expire_minutes: int = 1440  # 24 hours
    rate_limit_enabled: bool = True

    # Google sign-in only needs identity — no Gmail/Calendar access, and
    # therefore no offline refresh token needs to be requested or stored.
    google_scopes: list[str] = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    # Gemini (Google GenAI) API
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Cloudflare R2 (S3-compatible object storage)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "cover-letter-studio"
    r2_presigned_url_expire_seconds: int = 3600

    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_emails.split(",") if e.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    def is_email_allowed(self, email: str) -> bool:
        allowed = self.allowed_email_list
        if not allowed:
            return True
        return email.lower() in allowed


settings = Settings()
