from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+asyncpg://sweeps:sweeps@localhost:5432/sweeps"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"
    secret_key: str = "dev-secret-change-in-production"
    encryption_key: str = ""
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    allowed_emails: str = ""
    trusted_hosts: str = "localhost,127.0.0.1,api-jobs.tritechhelp.com"
    ors_api_key: str = ""
    gmail_poll_interval: int = 120
    jwt_expire_minutes: int = 1440  # 24 hours
    rate_limit_enabled: bool = True

    google_scopes: list[str] = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.events",
    ]

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

    def is_email_allowed(self, email: str) -> bool:
        allowed = self.allowed_email_list
        if not allowed:
            return True
        return email.lower() in allowed


settings = Settings()
