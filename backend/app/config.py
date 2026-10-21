from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str 
    secret_key:str
    frontend_origin:str 

    model_config = SettingsConfigDict(env_file= ".env")

settings = Settings()