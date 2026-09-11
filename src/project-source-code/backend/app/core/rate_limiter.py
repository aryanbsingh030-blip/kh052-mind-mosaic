"""
AI Skill Exchange — Sliding-Window Rate Limiter
Provides in-memory rate limiting to defend against brute-force, credential stuffing,
and denial-of-service attempts.
"""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    Sliding-window in-memory rate limiter.
    Stores timestamps of requests per client key and purges expired entries on access.
    """

    def __init__(self, requests_per_window: int = 120, window_seconds: int = 60):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.client_requests: Dict[str, List[float]] = defaultdict(list)

    def _get_client_key(self, request: Request) -> str:
        """Derive client identity from client host or authorization token."""
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # Key by token fragment
            return f"auth:{auth_header[-16:]}"

        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        client_host = request.client.host if request.client else "unknown"
        return f"ip:{client_host}"

    def check_rate_limit(self, request: Request, custom_limit: int = None, custom_window: int = None):
        """
        Evaluate whether the incoming request is within acceptable bounds.
        Raises HTTPException(429) if threshold is exceeded.
        """
        limit = custom_limit or self.requests_per_window
        window = custom_window or self.window_seconds
        now = time.time()
        client_key = self._get_client_key(request)

        # Evict timestamps older than current window
        cutoff = now - window
        timestamps = self.client_requests[client_key]
        self.client_requests[client_key] = [ts for ts in timestamps if ts > cutoff]

        # Check if rate limit exceeded
        if len(self.client_requests[client_key]) >= limit:
            oldest_timestamp = self.client_requests[client_key][0]
            retry_after = int(max(1, window - (now - oldest_timestamp)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {limit} requests per {window}s. Try again in {retry_after}s.",
                headers={"Retry-After": str(retry_after)},
            )

        # Record this request
        self.client_requests[client_key].append(now)

    def reset(self):
        """Reset all rate limiter state (useful in tests)."""
        self.client_requests.clear()


# Shared rate limiter instances
standard_rate_limiter = SlidingWindowRateLimiter(requests_per_window=120, window_seconds=60)
sensitive_rate_limiter = SlidingWindowRateLimiter(requests_per_window=20, window_seconds=60)


async def rate_limit_standard(request: Request):
    """Dependency for standard API endpoints."""
    standard_rate_limiter.check_rate_limit(request)


async def rate_limit_sensitive(request: Request):
    """Dependency for sensitive endpoints (auth, financial transfers, batch sync)."""
    sensitive_rate_limiter.check_rate_limit(request, custom_limit=20, custom_window=60)
