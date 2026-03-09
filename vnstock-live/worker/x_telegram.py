"""
X (Twitter) → Tiếng Việt → Telegram
Lấy bài viết từ @zerohedge, dịch sang tiếng Việt, gửi vào Telegram.
Sử dụng Nitter RSS (không cần X API key).
"""

import os
import json
import time
import logging
import hashlib
import html
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import feedparser
from deep_translator import GoogleTranslator

# ============================================================
# CONFIGURATION
# ============================================================
TELEGRAM_BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "8176419787:AAGVisWEzMu3-PB4hg4NTNJTMydku2BwP8A",
)
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "1899480201")

# X accounts to follow
X_ACCOUNTS = ["zerohedge"]

# Nitter instances (fallback order)
NITTER_INSTANCES = [
    "https://nitter.net",
    "https://xcancel.com",
    "https://nitter.poast.org",
    "https://nitter.privacydev.net",
]

# State file directory
STATE_DIR = Path(__file__).parent

def _state_file() -> Path:
    """Generate state file path based on current X_ACCOUNTS."""
    key = "_".join(sorted(X_ACCOUNTS))
    return STATE_DIR / f".x_state_{key}.json"

# Translation
TRANSLATE_TO = "vi"
MAX_TRANSLATE_LEN = 4500  # Google Translate has a 5000 char limit

VN_TZ = timezone(timedelta(hours=7))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("x-telegram")


# ============================================================
# STATE MANAGEMENT
# ============================================================
def load_state() -> dict:
    sf = _state_file()
    if sf.exists():
        try:
            return json.loads(sf.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"sent_ids": []}


def save_state(state: dict):
    _state_file().write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def get_tweet_id(entry) -> str:
    """Generate a unique ID for a tweet entry."""
    link = entry.get("link", "")
    title = entry.get("title", "")
    return hashlib.md5(f"{link}:{title}".encode()).hexdigest()[:16]


# ============================================================
# NITTER RSS FETCHER
# ============================================================
def fetch_tweets_rss(account: str) -> list:
    """Fetch tweets via Nitter RSS. Try multiple instances."""
    for instance in NITTER_INSTANCES:
        url = f"{instance}/{account}/rss"
        try:
            feed = feedparser.parse(url)
            if feed.entries and len(feed.entries) > 0:
                # Check if it's a real feed (not an error page)
                first_title = feed.entries[0].get("title", "")
                if "not yet whitelisted" in first_title.lower():
                    continue
                logger.info(f"✅ {instance}: {len(feed.entries)} tweets from @{account}")
                return feed.entries
        except Exception as e:
            logger.debug(f"   {instance} failed: {e}")
            continue
    
    logger.error(f"❌ All Nitter instances failed for @{account}")
    return []


# ============================================================
# TEXT PROCESSING
# ============================================================
def clean_tweet_text(raw_html: str) -> str:
    """Clean HTML from RSS entry to plain text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', raw_html)
    # Decode HTML entities
    text = html.unescape(text)
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove "RT by @..." prefix from retweets but keep the content
    text = re.sub(r'^RT by @\w+:\s*', '[RT] ', text)
    return text


def extract_links(raw_html: str) -> list:
    """Extract URLs from HTML content."""
    urls = re.findall(r'href="([^"]+)"', raw_html)
    # Filter out nitter links, keep real links
    real_urls = []
    for u in urls:
        if any(inst.replace("https://", "") in u for inst in NITTER_INSTANCES):
            continue
        if u.startswith("http"):
            real_urls.append(u)
    return real_urls


def translate_text(text: str) -> str:
    """Translate text to Vietnamese using Google Translate."""
    if not text or len(text.strip()) < 3:
        return text
    try:
        # Split long texts into chunks
        if len(text) > MAX_TRANSLATE_LEN:
            chunks = [text[i:i+MAX_TRANSLATE_LEN] for i in range(0, len(text), MAX_TRANSLATE_LEN)]
            translated = []
            for chunk in chunks:
                t = GoogleTranslator(source='auto', target=TRANSLATE_TO).translate(chunk)
                translated.append(t or chunk)
                time.sleep(0.3)
            return " ".join(translated)
        else:
            result = GoogleTranslator(source='auto', target=TRANSLATE_TO).translate(text)
            return result or text
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
        return text


# ============================================================
# TELEGRAM
# ============================================================
def telegram_send(chat_id: str, text: str):
    """Send message to Telegram with retry."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
    }
    try:
        r = httpx.post(url, json=payload, timeout=15)
        data = r.json()
        if not data.get("ok"):
            # Try without HTML parse mode if formatting fails
            payload["parse_mode"] = ""
            payload["text"] = re.sub(r'<[^>]+>', '', text)  # Strip HTML
            r = httpx.post(url, json=payload, timeout=15)
        return data.get("ok", False)
    except Exception as e:
        logger.error(f"Telegram error: {e}")
        return False


# ============================================================
# MAIN
# ============================================================
def run():
    logger.info("🚀 X → Telegram Bot starting...")
    state = load_state()
    sent_ids = set(state.get("sent_ids", []))
    new_sent = []

    for account in X_ACCOUNTS:
        logger.info(f"📡 Fetching @{account}...")
        entries = fetch_tweets_rss(account)

        if not entries:
            continue

        # Process newest first, but send oldest first (chronological order)
        new_entries = []
        for entry in entries:
            tid = get_tweet_id(entry)
            if tid not in sent_ids:
                new_entries.append((tid, entry))

        # Reverse to send oldest first
        new_entries.reverse()
        logger.info(f"📝 {len(new_entries)} new tweets from @{account}")

        for tid, entry in new_entries:
            # Extract content
            title = entry.get("title", "")
            summary = entry.get("summary", entry.get("description", ""))
            link = entry.get("link", "")
            published = entry.get("published", "")

            # Get clean text
            original_text = clean_tweet_text(summary or title)
            if not original_text or len(original_text) < 5:
                sent_ids.add(tid)
                new_sent.append(tid)
                continue

            # Detect if it's a retweet
            is_rt = title.startswith("RT by @") or original_text.startswith("[RT]")

            # Translate
            logger.info(f"🔄 Translating: {original_text[:60]}...")
            translated = translate_text(original_text)

            # Extract any article links
            links = extract_links(summary or "")

            # Build message
            tag = "🔄 RT" if is_rt else "📰"
            msg_parts = [
                f"{tag} <b>@{account}</b>",
                "",
                f"🇺🇸 {original_text}",
                "",
                f"🇻🇳 {translated}",
            ]

            if links:
                msg_parts.append("")
                msg_parts.append("🔗 " + " | ".join(f'<a href="{u}">Link</a>' for u in links[:3]))

            # Fix nitter link to x.com
            x_link = link
            for inst in NITTER_INSTANCES:
                x_link = x_link.replace(inst, "https://x.com")
            
            if x_link:
                msg_parts.append(f"\n📎 <a href=\"{x_link}\">Xem trên X</a>")

            if published:
                msg_parts.append(f"\n⏰ {published}")

            message = "\n".join(msg_parts)

            # Send to Telegram
            if telegram_send(TELEGRAM_CHAT_ID, message):
                logger.info(f"✅ Sent: {original_text[:50]}...")
                sent_ids.add(tid)
                new_sent.append(tid)
            else:
                logger.error(f"❌ Failed to send: {original_text[:50]}...")

            time.sleep(1)  # Rate limiting

    # Save state — keep last 500 IDs
    all_ids = list(sent_ids)[-500:]
    state["sent_ids"] = all_ids
    state["last_run"] = datetime.now(VN_TZ).isoformat()
    save_state(state)

    logger.info(f"✅ Done! Sent {len(new_sent)} new tweets.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="X → Telegram Translator Bot")
    parser.add_argument("--chat-id", type=str, default=TELEGRAM_CHAT_ID)
    parser.add_argument("--accounts", nargs="+", default=X_ACCOUNTS, help="X accounts to follow")
    args = parser.parse_args()

    TELEGRAM_CHAT_ID = args.chat_id
    X_ACCOUNTS[:] = args.accounts


    run()


