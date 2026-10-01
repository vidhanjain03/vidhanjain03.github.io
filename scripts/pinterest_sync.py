#!/usr/bin/env python3
"""
Pinterest -> website photo sync (one direction only: it READS from Pinterest, never writes).

What it does
  * Fetches every Pin YOU uploaded to Pinterest (pins you saved from other people are skipped).
  * Adds new ones to src/_data/pinterestPins.json, which the /photos/ page reads.
  * Skips anything listed under "removed" in src/_data/photos.json, so a photo you take off
    the website never comes back.
  * By default, deleting a pin on Pinterest does NOT remove it from the website
    (set "removeWhenDeletedOnPinterest": true in photos.json if you want that).

Where it runs
  * Every few hours on GitHub (.github/workflows/pinterest-sync.yml).
  * Once on your computer via scripts/pinterest_login.py (first-time login + import).

Login
  Needs three GitHub secrets: PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN.
  Pinterest renews the login each time it's used; the renewed login is kept, encrypted with
  your app secret, in the file .pinterest-state at the repo root.

Only the Python standard library is needed, except for the `cryptography` package, which is
only used to read/write .pinterest-state (installed automatically on GitHub).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT / "src" / "_data" / "photos.json"
PINS_FILE = ROOT / "src" / "_data" / "pinterestPins.json"
STATE_FILE = ROOT / ".pinterest-state"

API = os.environ.get("PINTEREST_API_BASE", "https://api.pinterest.com/v5").rstrip("/")
UA = "vidhanjain.com photo sync"
RENEW_WHEN_DAYS_LEFT = 5


class AuthError(Exception):
    """The Pinterest login is missing, expired or rejected. Needs a human."""


class TemporaryError(Exception):
    """Pinterest is down, slow, or rate-limiting. Try again later."""


def log(msg: str) -> None:
    print(f"[pinterest] {msg}", flush=True)


# --------------------------------------------------------------------------- files

def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def pin_id(value) -> str | None:
    """Accepts '1234', 1234, or 'https://www.pinterest.com/pin/1234/' and returns '1234'."""
    digits = "".join(ch if ch.isdigit() else " " for ch in str(value)).split()
    return max(digits, key=len) if digits else None


# --------------------------------------------------------------------------- HTTP

def http(method: str, url: str, *, token: str | None = None, basic: tuple[str, str] | None = None,
         form: dict | None = None) -> dict:
    headers = {"Accept": "application/json", "User-Agent": UA}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if basic:
        headers["Authorization"] = "Basic " + base64.b64encode(f"{basic[0]}:{basic[1]}".encode()).decode()
    if form is not None:
        body = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        if e.code in (400, 401, 403):
            raise AuthError(f"Pinterest said {e.code} for {url.split('?')[0]}: {detail}") from None
        raise TemporaryError(f"Pinterest said {e.code}: {detail}") from None
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise TemporaryError(f"Could not reach Pinterest: {e}") from None


# --------------------------------------------------------------------------- login state

def _key(app_secret: str) -> bytes:
    return hashlib.sha256(b"vidhanjain.com pinterest-state v1|" + app_secret.encode()).digest()


def load_state(app_secret: str) -> dict:
    if not STATE_FILE.exists() or not app_secret:
        return {}
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        raw = base64.b64decode(STATE_FILE.read_text().strip())
        return json.loads(AESGCM(_key(app_secret)).decrypt(raw[:12], raw[12:], None))
    except ImportError:
        log("Note: `cryptography` isn't installed, so the saved login in .pinterest-state is ignored.")
    except Exception:
        log("Note: couldn't read .pinterest-state (app secret changed?). Falling back to PINTEREST_REFRESH_TOKEN.")
    return {}


def save_state(app_secret: str, state: dict) -> bool:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        return False
    nonce = os.urandom(12)
    ct = AESGCM(_key(app_secret)).encrypt(nonce, json.dumps(state).encode(), None)
    STATE_FILE.write_text(base64.b64encode(nonce + ct).decode() + "\n")
    return True


def exchange(app_id: str, app_secret: str, form: dict) -> dict:
    """Calls POST /oauth/token (authorization code or refresh) and returns the token response."""
    form = {**form, "continuous_refresh": "true"}
    return http("POST", f"{API}/oauth/token", basic=(app_id, app_secret), form=form)


def get_access_token() -> str:
    """Returns a working access token, renewing the login if needed."""
    if os.environ.get("PINTEREST_ACCESS_TOKEN"):
        return os.environ["PINTEREST_ACCESS_TOKEN"]

    app_id = os.environ.get("PINTEREST_APP_ID", "").strip()
    app_secret = os.environ.get("PINTEREST_APP_SECRET", "").strip()
    secret_refresh = os.environ.get("PINTEREST_REFRESH_TOKEN", "").strip()
    if not (app_id and app_secret and (secret_refresh or STATE_FILE.exists())):
        raise AuthError("PINTEREST_APP_ID, PINTEREST_APP_SECRET and PINTEREST_REFRESH_TOKEN aren't set. "
                        "Run scripts/pinterest_login.py once and add the three GitHub secrets it prints.")

    state = load_state(app_secret)
    now = time.time()
    if state.get("access_token") and state.get("access_expires_at", 0) - now > RENEW_WHEN_DAYS_LEFT * 86400:
        return state["access_token"]

    # Try the newest refresh token first, then the one stored in GitHub secrets.
    candidates = [t for t in (state.get("refresh_token"), secret_refresh) if t]
    last_error = None
    for refresh in dict.fromkeys(candidates):
        try:
            data = exchange(app_id, app_secret, {"grant_type": "refresh_token", "refresh_token": refresh})
        except AuthError as e:
            last_error = e
            continue
        new_state = {
            "access_token": data["access_token"],
            "access_expires_at": now + int(data.get("expires_in", 0)),
            "refresh_token": data.get("refresh_token") or refresh,
            "refresh_expires_at": now + int(data.get("refresh_token_expires_in", 60 * 86400)),
        }
        if save_state(app_secret, new_state):
            days = (new_state["refresh_expires_at"] - now) / 86400
            log(f"Login renewed (good for about {days:.0f} more days, renewed automatically).")
        else:
            log("Login renewed, but it couldn't be saved (install `cryptography`). Fine for a one-off run.")
        return new_state["access_token"]
    raise AuthError(f"The Pinterest login has expired or was revoked. Run scripts/pinterest_login.py again "
                    f"and update the PINTEREST_REFRESH_TOKEN secret. ({last_error})")


# --------------------------------------------------------------------------- pins

def list_my_pins(token: str) -> list[dict]:
    """Every pin the account created itself (saves/repins excluded). Follows all pages."""
    pins, bookmark = [], None
    for _ in range(400):  # hard stop at 100k pins
        q = {"pin_filter": "exclude_repins", "page_size": "250"}
        if bookmark:
            q["bookmark"] = bookmark
        data = http("GET", f"{API}/pins?{urllib.parse.urlencode(q)}", token=token)
        pins.extend(data.get("items") or [])
        bookmark = data.get("bookmark")
        if not bookmark:
            return pins
    return pins


def _best(images: dict | None) -> tuple[str | None, str | None, int | None, int | None]:
    """From Pinterest's size map, pick a gallery-size and a full-size image URL."""
    images = images or {}
    big = images.get("1200x") or images.get("600x") or images.get("400x300")
    if not big or not big.get("url"):
        return None, None, None, None
    full = big["url"]
    grid = full
    if "i.pinimg.com/" in full:  # Pinterest serves other widths by swapping the size folder
        parts = full.split("/")
        i = parts.index("i.pinimg.com") + 1 if "i.pinimg.com" in parts else None
        if i is not None:
            parts[i] = "736x"
            grid = "/".join(parts)
    return grid, full, big.get("width"), big.get("height")


def _caption(*texts) -> str:
    for t in texts:
        t = " ".join(str(t or "").split())
        if t:
            return t if len(t) <= 160 else t[:157].rsplit(" ", 1)[0] + "…"
    return ""


def photos_from_pin(p: dict) -> list[dict]:
    """A pin can hold one image or several (carousel). Videos are skipped."""
    if p.get("is_owner") is False or p.get("parent_pin_id"):
        return []  # saved from someone else
    pid = str(p.get("id") or "")
    media = p.get("media") or {}
    kind = media.get("media_type")
    if kind == "image":
        entries = [(media.get("images"), None, None)]
    elif kind in ("multiple_images", "multiple_mixed"):
        entries = [(it.get("images"), it.get("title"), it.get("description"))
                   for it in media.get("items") or [] if it.get("item_type", "image") == "image"]
    else:
        return []
    out = []
    for n, (images, title, desc) in enumerate(entries):
        grid, full, w, h = _best(images)
        if not grid:
            continue
        out.append({
            "id": pid if n == 0 else f"{pid}-{n}",
            "pin": pid,
            "image": grid,
            "full": full,
            "width": w,
            "height": h,
            "caption": _caption(title, p.get("title"), desc, p.get("description"), p.get("alt_text")),
            "alt": _caption(p.get("alt_text"), title, p.get("title"), desc, p.get("description")),
            "date": p.get("created_at"),
            "link": f"https://www.pinterest.com/pin/{pid}/",
        })
    return out


def merge(archive: list[dict], fetched: list[dict], removed: set[str], drop_missing: bool) -> tuple[list[dict], int, int]:
    """Add new photos, refresh captions of known ones, skip removed ones. Returns (photos, added, dropped)."""
    by_id = {p["id"]: p for p in archive}
    added = 0
    for p in fetched:
        if p["pin"] in removed:
            continue
        if p["id"] in by_id:
            old = by_id[p["id"]]
            by_id[p["id"]] = {**old, **p, "date": old.get("date") or p.get("date")}
        else:
            by_id[p["id"]] = p
            added += 1
    dropped = 0
    fetched_ids = {p["id"] for p in fetched}
    for pid in list(by_id):
        gone_from_pinterest = drop_missing and pid not in fetched_ids
        if by_id[pid].get("pin", pid) in removed or gone_from_pinterest:
            del by_id[pid]
            dropped += 1
    photos = sorted(by_id.values(), key=lambda p: p.get("date") or "", reverse=True)
    return photos, added, dropped


def sync(token: str | None = None) -> int:
    config = read_json(CONFIG_FILE, {})
    pconf = config.get("pinterest") or {}
    if pconf.get("enabled") is False:
        log("Pinterest sync is turned off in photos.json.")
        return 0
    removed = {pin_id(x) for x in config.get("removed") or []} - {None}

    token = token or get_access_token()
    raw = list_my_pins(token)
    fetched = [ph for p in raw for ph in photos_from_pin(p)]
    log(f"Found {len(raw)} pins you created ({len(fetched)} photos; videos and saved pins skipped).")

    current = read_json(PINS_FILE, {})
    before = current.get("photos") or []
    photos, added, dropped = merge(before, fetched, removed, bool(pconf.get("removeWhenDeletedOnPinterest")))
    if photos != before or "photos" not in current:
        write_json(PINS_FILE, {"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "photos": photos})
    log(f"{added} new, {dropped} removed, {len(photos)} Pinterest photos on the site.")
    return added + dropped


def main() -> int:
    try:
        sync()
        return 0
    except AuthError as e:
        log(f"LOGIN PROBLEM: {e}")
        return 1  # makes the GitHub Action fail, so GitHub emails you
    except TemporaryError as e:
        log(f"Pinterest is having trouble, will try again next run: {e}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
