from pydantic_settings import BaseSettings
from supabase import create_client, Client


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
