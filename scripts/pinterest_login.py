#!/usr/bin/env python3
"""
One-time Pinterest login + first import.  Run it on your own computer:

    python scripts/pinterest_login.py

It will:
  1. Ask for your Pinterest app ID and secret (from developers.pinterest.com/apps).
  2. Open Pinterest in your browser so you can approve READ-ONLY access to your pins.
  3. Import every photo you've uploaded into src/_data/pinterestPins.json.
  4. Print the three values to save as GitHub secrets, so the sync keeps running by itself.

Needs only Python 3.8+ (no pip installs). Nothing is ever posted to Pinterest.
"""

from __future__ import annotations

import getpass
import http.server
import secrets
import sys
import threading
import urllib.parse
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pinterest_sync as ps  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

PORT = 8085
REDIRECT_URI = f"http://localhost:{PORT}/"
SCOPES = "pins:read,boards:read,user_accounts:read"


def wait_for_code(expected_state: str) -> str:
    result: dict = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" in q or "error" in q:
                result.update({k: v[0] for k, v in q.items()})
                ok = "code" in q and q.get("state", [""])[0] == expected_state
                msg = ("All set! You can close this tab and go back to the terminal."
                       if ok else "Something went wrong. Check the terminal.")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"<h2 style='font-family:sans-serif'>{msg}</h2>".encode())
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("localhost", PORT), Handler)
    thread = threading.Thread(target=lambda: [server.handle_request() for _ in range(20) if not result])
    thread.daemon = True
    thread.start()
    thread.join(timeout=300)
    server.server_close()

    if "error" in result:
        sys.exit(f"\nPinterest returned an error: {result.get('error')} {result.get('error_description', '')}")
    if not result.get("code"):
        sys.exit("\nTimed out waiting for Pinterest. Run the script again.")
    if result.get("state") != expected_state:
        sys.exit("\nSecurity check failed (state mismatch). Run the script again.")
    return result["code"]


def main() -> None:
    print(__doc__)
    print(f"Before continuing, make sure your Pinterest app lists this Redirect URI:\n    {REDIRECT_URI}\n")
    app_id = input("Pinterest App ID: ").strip()
    app_secret = getpass.getpass("Pinterest App secret (hidden as you type): ").strip()
    if not app_id or not app_secret:
        sys.exit("Both are required.")

    state = secrets.token_urlsafe(16)
    url = "https://www.pinterest.com/oauth/?" + urllib.parse.urlencode({
        "client_id": app_id, "redirect_uri": REDIRECT_URI, "response_type": "code",
        "scope": SCOPES, "state": state,
    })
    print("\nOpening Pinterest in your browser. If it doesn't open, paste this link:\n" + url + "\n")
    webbrowser.open(url)
    code = wait_for_code(state)

    try:
        tokens = ps.exchange(app_id, app_secret, {
            "grant_type": "authorization_code", "code": code, "redirect_uri": REDIRECT_URI,
        })
    except ps.AuthError as e:
        sys.exit(f"\nPinterest refused the login: {e}")

    access = tokens["access_token"]
    refresh = tokens.get("refresh_token")
    try:
        me = ps.http("GET", f"{ps.API}/user_account", token=access)
        print(f"Logged in as: {me.get('username')}")
    except Exception:
        pass

    print("\nImporting your photos...")
    try:
        ps.sync(token=access)
    except (ps.AuthError, ps.TemporaryError) as e:
        print(f"Import failed: {e}\n(You can still save the secrets below; GitHub will retry.)")

    print(f"\nDone. Your photos are listed in {ps.PINS_FILE.relative_to(ps.ROOT)}.")
    if not refresh:
        print("\nPinterest didn't return a refresh token, so automatic syncing can't be set up. "
              "Check that your app has 'continuous refresh' tokens enabled.")
        return
    print("""
------------------------------------------------------------------------
Last step: add these as GitHub secrets, so the sync keeps running on its own.
GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret
------------------------------------------------------------------------""")
    print(f"PINTEREST_APP_ID         = {app_id}")
    print("PINTEREST_APP_SECRET     = (the app secret you just typed)")
    print(f"PINTEREST_REFRESH_TOKEN  = {refresh}")
    print("------------------------------------------------------------------------")
    print("Keep these private. Don't paste them into any file in the repo.")


if __name__ == "__main__":
    main()
