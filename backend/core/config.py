from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    firebase_project_id: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "*"]

    odoo_url: str = "https://erp.inapps.net"
    odoo_db: str = "inapps"
    odoo_user: str = ""
    odoo_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
