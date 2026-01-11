"""Execution session storage service."""

from typing import Optional
from datetime import datetime

from ..models import ExecutionSession, ExecutionStatus


class ExecutionStorage:
    """In-memory storage for execution sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, ExecutionSession] = {}

    def save(self, session: ExecutionSession) -> None:
        """Save an execution session."""
        self._sessions[session.id] = session

    def get(self, session_id: str) -> Optional[ExecutionSession]:
        """Get an execution session by ID."""
        return self._sessions.get(session_id)

    def list_all(self, skill_id: Optional[str] = None) -> list[ExecutionSession]:
        """List all execution sessions, optionally filtered by skill ID."""
        sessions = list(self._sessions.values())

        if skill_id:
            sessions = [s for s in sessions if s.skill_package_id == skill_id]

        # Sort by created_at descending (most recent first)
        sessions.sort(key=lambda s: s.started_at, reverse=True)

        return sessions

    def update_status(
        self,
        session_id: str,
        status: ExecutionStatus,
        ended_at: Optional[datetime] = None,
    ) -> Optional[ExecutionSession]:
        """Update status of an execution session."""
        session = self._sessions.get(session_id)
        if session:
            session.status = status
            if ended_at:
                session.ended_at = ended_at
            self._sessions[session_id] = session
        return session

    def delete(self, session_id: str) -> bool:
        """Delete an execution session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def clear(self) -> None:
        """Clear all sessions."""
        self._sessions.clear()


# Global instance
_execution_storage: Optional[ExecutionStorage] = None


def get_execution_storage() -> ExecutionStorage:
    """Get the global execution storage instance."""
    global _execution_storage
    if _execution_storage is None:
        _execution_storage = ExecutionStorage()
    return _execution_storage
