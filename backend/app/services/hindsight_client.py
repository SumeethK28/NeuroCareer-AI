from __future__ import annotations

from typing import Any, Iterable

import httpx

from app.core.config import settings
from app.core.errors import MemoryUnavailableError

try:
    # Preferred SDK
    from hindsight_client import HindsightClient as SDKClient  # type: ignore
except Exception:  # pragma: no cover - SDK may not be installed yet
    SDKClient = None  # type: ignore[assignment]


class HindsightMemoryClient:
    """Thin wrapper around the Hindsight SDK with graceful degradation."""

    def __init__(
        self,
        base_url: str = str(settings.hindsight_base_url),
        api_key: str = settings.hindsight_api_key,
        default_bank_id: str = settings.hindsight_bank_id,
        timeout: float = 20.0,
    ) -> None:
        base = base_url.rstrip("/")
        self._api_base = base if base.endswith("/v1") else f"{base}/v1"
        self._api_key = api_key
        self._default_bank_id = default_bank_id
        self._timeout = timeout
        self._sdk_client = None

        if SDKClient:
            self._sdk_client = SDKClient(api_key=self._api_key, base_url=self._api_base)
        else:
            self._http = httpx.AsyncClient(
                base_url=self._api_base,
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                timeout=self._timeout,
            )

    def _resolve_bank_id(self, user_id: str) -> str:
        if not self._default_bank_id:
            return user_id
        return f"{self._default_bank_id}:{user_id}"

    async def retain_experience(self, user_id: str, payload: dict[str, Any]) -> None:
        content = self._flatten_experience(payload)
        memory = {"content": content}
        if self._sdk_client:
            self._sdk_client.retain(bank_id=self._resolve_bank_id(user_id), experience=memory)
            return
        await self._post(
            f"/default/banks/{self._resolve_bank_id(user_id)}/memories",
            {"items": [memory]},
        )

    async def retain_observations(self, user_id: str, observations: Iterable[dict[str, Any]]) -> None:
        items = list(observations)
        if not items:
            return
        if self._sdk_client:
            self._sdk_client.retain_observations(bank_id=self._resolve_bank_id(user_id), observations=items)
            return
        memories = [
            {"content": self._flatten_observation(item)}
            for item in items
        ]
        await self._post(
            f"/default/banks/{self._resolve_bank_id(user_id)}/memories",
            {"items": memories},
        )

    async def recall(
        self, user_id: str, query: str, options: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if self._sdk_client:
            return self._sdk_client.recall(
                bank_id=self._resolve_bank_id(user_id),
                query=query,
                **(options or {}),
            )
        payload = {"query": query, **(options or {})}
        return await self._post(
            f"/default/banks/{self._resolve_bank_id(user_id)}/memories/recall",
            payload,
        )

    async def reflect(self, user_id: str, query: str, lookback_days: int = 7) -> dict[str, Any]:
        """Reflect on recent memories using a query prompt."""
        if self._sdk_client:
            return self._sdk_client.reflect(
                bank_id=self._resolve_bank_id(user_id),
                query=query,
                lookback_days=lookback_days,
            )
        return await self._post(
            f"/default/banks/{self._resolve_bank_id(user_id)}/reflect",
            {"query": query, "lookback_days": lookback_days},
        )

    async def wipe_bank(self, user_id: str) -> None:
        if self._sdk_client:
            self._sdk_client.wipe(bank_id=self._resolve_bank_id(user_id))
            return
        await self._post(f"/default/banks/{self._resolve_bank_id(user_id)}/wipe", {})

    async def _post(self, endpoint: str, payload: dict[str, Any]) -> Any:
        try:
            if not self._api_key:
                raise MemoryUnavailableError("Hindsight API key missing.")
            response = await self._http.post(endpoint, json=payload)
            response.raise_for_status()
            if response.content:
                return response.json()
            return {}
        except httpx.HTTPError as exc:
            raise MemoryUnavailableError(f"Hindsight request failed for {endpoint}") from exc

    @staticmethod
    def _flatten_experience(payload: dict[str, Any]) -> str:
        parts: list[str] = []
        title = str(payload.get("title") or "").strip()
        summary = str(payload.get("summary") or "").strip()
        tags = payload.get("tags") or []
        evidence = str(payload.get("evidence_url") or "").strip()
        captured_at = str(payload.get("captured_at") or "").strip()
        if title:
            parts.append(f"Title: {title}")
        if summary:
            parts.append(f"Summary: {summary}")
        if tags:
            parts.append(f"Tags: {', '.join(str(tag) for tag in tags)}")
        if evidence:
            parts.append(f"Evidence: {evidence}")
        if captured_at:
            parts.append(f"Captured at: {captured_at}")
        return " | ".join(parts) if parts else "Experience recorded."

    @staticmethod
    def _flatten_observation(payload: dict[str, Any]) -> str:
        parts: list[str] = []
        skill = str(payload.get("skill") or payload.get("label") or payload.get("name") or "").strip()
        level = str(payload.get("level") or "").strip()
        notes = str(payload.get("notes") or payload.get("summary") or "").strip()
        confidence = payload.get("confidence")
        if skill:
            parts.append(f"Skill: {skill}")
        if level:
            parts.append(f"Level: {level}")
        if confidence is not None:
            parts.append(f"Confidence: {float(confidence):.2f}")
        if notes:
            parts.append(f"Notes: {notes}")
        result = " | ".join(parts) if parts else "Observation recorded."
        return result if result else "Skill observation recorded."

    async def aclose(self) -> None:
        if hasattr(self, "_http"):
            await self._http.aclose()
