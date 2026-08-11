from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from typing import Any, Callable
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .errors import NexpulseError

Transport = Callable[[Request, float], tuple[int, dict[str, str], bytes]]
RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


def _default_transport(request: Request, timeout: float) -> tuple[int, dict[str, str], bytes]:
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, dict(response.headers.items()), response.read()
    except HTTPError as error:
        return error.code, dict(error.headers.items()), error.read()


@dataclass(frozen=True)
class ClientOptions:
    api_key: str | None = None
    access_token: str | None = None
    base_url: str = "https://api.nexpulse.ai/api/v1"
    timeout_seconds: float = 30.0
    max_retries: int = 2
    user_agent_suffix: str | None = None


class _Organizations:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def current(self) -> dict[str, Any]:
        return self._client.get("/organizations/current")

    def update(self, **values: str) -> dict[str, Any]:
        return self._client.patch("/organizations/current", json_body=values)


class _Users:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def list(self) -> list[dict[str, Any]]:
        return self._client.get("/users")

    def retrieve(self, user_id: str) -> dict[str, Any]:
        return self._client.get(f"/users/{user_id}")


class _Workspaces:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def list(self) -> list[dict[str, Any]]:
        return self._client.get("/workspaces")

    def current(self) -> dict[str, Any]:
        return self._client.get("/workspaces/current")


class _Analytics:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def retrieve(self, *, connection_id: str, start: str, end: str, **query: Any) -> dict[str, Any]:
        return self._client.get(
            "/analytics",
            query={"connectionId": connection_id, "from": start, "to": end, **query},
        )


class _Reports:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def list(self, connection_id: str) -> dict[str, Any]:
        return self._client.get("/reports", query={"connectionId": connection_id})

    def generate(self, values: dict[str, Any], *, idempotency_key: str | None = None) -> dict[str, Any]:
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        return self._client.post("/reports", json_body=values, headers=headers)


class _Dashboards:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def retrieve(self, *, connection_id: str, start: str, end: str) -> dict[str, Any]:
        return self._client.get(
            "/dashboard",
            query={"connectionId": connection_id, "from": start, "to": end},
        )


class _Notifications:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def list(self, **query: Any) -> dict[str, Any]:
        return self._client.get("/notifications", query=query)


class _Connections:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def list(self) -> list[dict[str, Any]]:
        return self._client.get("/platforms/connections")


class _AI:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def chat(self, *, connection_id: str, conversation_id: str, message: str) -> dict[str, Any]:
        return self._client.post(
            "/ai/chat",
            json_body={
                "connectionId": connection_id,
                "conversationId": conversation_id,
                "message": message,
            },
        )


class _Developer:
    def __init__(self, client: "NexpulseClient") -> None:
        self._client = client

    def catalog(self) -> dict[str, Any]:
        return self._client.get("/developer/catalog")

    def usage(self, days: int = 30) -> dict[str, Any]:
        return self._client.get("/developer/usage", query={"days": days})

    def webhooks(self) -> list[dict[str, Any]]:
        return self._client.get("/developer/webhooks")

    def deliveries(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._client.get("/developer/webhook-deliveries", query={"limit": limit})

    def marketplace(self) -> list[dict[str, Any]]:
        return self._client.get("/developer/marketplace")


class NexpulseClient:
    def __init__(self, options: ClientOptions, *, transport: Transport | None = None) -> None:
        if bool(options.api_key) == bool(options.access_token):
            raise ValueError("Provide exactly one of api_key or access_token")
        self._options = options
        self._transport = transport or _default_transport
        self._base_url = options.base_url.rstrip("/")
        self.organizations = _Organizations(self)
        self.users = _Users(self)
        self.workspaces = _Workspaces(self)
        self.analytics = _Analytics(self)
        self.reports = _Reports(self)
        self.dashboards = _Dashboards(self)
        self.notifications = _Notifications(self)
        self.connections = _Connections(self)
        self.ai = _AI(self)
        self.developer = _Developer(self)

    def get(self, path: str, *, query: dict[str, Any] | None = None) -> Any:
        return self.request("GET", path, query=query)

    def post(
        self,
        path: str,
        *,
        json_body: Any = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        return self.request("POST", path, json_body=json_body, headers=headers)

    def patch(
        self,
        path: str,
        *,
        json_body: Any = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        return self.request("PATCH", path, json_body=json_body, headers=headers)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    def request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, Any] | None = None,
        json_body: Any = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        filtered_query = {key: value for key, value in (query or {}).items() if value is not None}
        encoded_query = f"?{urlencode(filtered_query)}" if filtered_query else ""
        url = f"{self._base_url}/{path.lstrip('/')}{encoded_query}"
        sdk = "python/1.0.0"
        if self._options.user_agent_suffix:
            sdk = f"{sdk} {self._options.user_agent_suffix}"
        request_headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-NEXPULSE-SDK": sdk,
            **(headers or {}),
        }
        if self._options.api_key:
            request_headers["X-API-Key"] = self._options.api_key
        else:
            request_headers["Authorization"] = f"Bearer {self._options.access_token}"
        body = None if json_body is None else json.dumps(json_body).encode("utf-8")

        for attempt in range(self._options.max_retries + 1):
            status, response_headers, response_body = self._transport(
                Request(url, data=body, headers=request_headers, method=method),
                self._options.timeout_seconds,
            )
            if 200 <= status < 300:
                if not response_body:
                    return None
                payload = json.loads(response_body)
                return payload.get("data", payload)
            if status in RETRYABLE_STATUS and attempt < self._options.max_retries:
                retry_after = response_headers.get("Retry-After")
                wait = float(retry_after) if retry_after else 0.25 * (2**attempt) + random.random() * 0.1
                time.sleep(wait)
                continue
            try:
                payload = json.loads(response_body)
            except json.JSONDecodeError:
                payload = {}
            error = payload.get("error", {})
            raise NexpulseError(
                error.get("message", f"NEXPULSE API returned HTTP {status}"),
                status=status,
                code=error.get("code", "HTTP_ERROR"),
                request_id=response_headers.get("X-Request-Id"),
                details=error.get("errors"),
            )
        raise RuntimeError("Unreachable retry state")


def create_cli_client(token: str, *, base_url: str | None = None) -> NexpulseClient:
    return NexpulseClient(
        ClientOptions(
            access_token=token,
            base_url=base_url or "https://api.nexpulse.ai/api/v1",
            user_agent_suffix="cli",
        )
    )
