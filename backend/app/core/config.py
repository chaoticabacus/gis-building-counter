"""Application configuration via environment variables."""

import os
from typing import List, Optional


class Settings:
    """Application settings loaded from environment variables."""

    @property
    def colab_url(self) -> Optional[str]:
        return os.getenv("COLAB_URL")

    @property
    def gee_service_account_key(self) -> Optional[str]:
        """Path to GEE service account JSON key file."""
        return os.getenv("GEE_SERVICE_ACCOUNT_KEY")

    @property
    def allowed_origins(self) -> List[str]:
        origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
        return [o.strip() for o in origins.split(",")]

    @property
    def max_upload_size_mb(self) -> int:
        return int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))

    @property
    def tile_cache_dir(self) -> str:
        return os.getenv("TILE_CACHE_DIR", "/tmp/gis_tiles")


settings = Settings()
