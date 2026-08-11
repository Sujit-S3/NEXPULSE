from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any


def verify_webhook(
    payload: str,
    signature: str,
    secret: str,
    *,
    tolerance_seconds: int = 300,
    now_seconds: int | None = None,
) -> dict[str, Any]:
    values = dict(part.split("=", 1) for part in signature.split(",") if "=" in part)
    try:
        timestamp = int(values["t"])
        supplied = values["v1"]
    except (KeyError, ValueError) as error:
        raise ValueError("Webhook signature is malformed") from error
    now = int(time.time()) if now_seconds is None else now_seconds
    if abs(now - timestamp) > tolerance_seconds:
        raise ValueError("Webhook signature timestamp is invalid")
    expected = hmac.new(
        secret.encode("utf-8"),
        f"{timestamp}.{payload}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, supplied):
        raise ValueError("Webhook signature is invalid")
    event = json.loads(payload)
    if not isinstance(event, dict):
        raise ValueError("Webhook payload must be a JSON object")
    return event
