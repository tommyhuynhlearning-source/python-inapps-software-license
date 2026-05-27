from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    firebase_project_id: str = ""
    google_refresh_token: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "*"]

    odoo_url: str = "https://erp.inapps.net"
    odoo_db: str = "inapps"
    odoo_user: str = ""
    odoo_api_key: str = ""

    smtp_user: str = ""
    smtp_password: str = ""
    smtp_to: str = "anh.huynh@inapps.net"

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-southeast-1"

    class Config:
        env_file = str(_ENV_FILE)


settings = Settings()
