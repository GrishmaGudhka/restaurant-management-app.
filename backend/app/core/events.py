import asyncio
from typing import AsyncGenerator


class OrderBroadcaster:
    """Manages real-time event subscriptions for active kitchen and order tickets."""

    def __init__(self):
        self._subscribers: set[asyncio.Queue] = set()

    async def subscribe(self) -> AsyncGenerator[str, None]:
        """Subscribes an SSE connection to live order event updates."""
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        try:
            while True:
                data = await queue.get()
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            self._subscribers.remove(queue)

    def notify(self, message: str = "refresh"):
        """Broadcasts an update event to all active listener connections."""
        for queue in list(self._subscribers):
            queue.put_nowait(message)


broadcaster = OrderBroadcaster()