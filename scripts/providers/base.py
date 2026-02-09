import httpx
import logging
import os
from typing import Optional, List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProviderError(Exception):
    pass

class BaseProvider:
    def __init__(self):
        self.client = httpx.Client(
            timeout=30,
            follow_redirects=True,
            verify=False,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )

    def fetch(self, target_date):
        raise NotImplementedError

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError)
    )
    def _post(self, url: str, **kwargs) -> httpx.Response:
        try:
            response = self.client.post(url, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPError as e:
            logger.error(f"HTTP error posting {url}: {e}")
            raise

    def _parse_vietnamese_float(self, value: str) -> Optional[float]:
        if not value or value.strip() in ['', '-', 'N/A', 'NA']:
            return None
        try:
            import re
            cleaned = value.strip().replace('%', '').strip()
            if ',' in cleaned:
                cleaned = cleaned.replace('.', '').replace(',', '.')
                return float(cleaned)
            return float(cleaned)
        except (ValueError, AttributeError):
            return None
