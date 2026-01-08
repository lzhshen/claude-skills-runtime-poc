"""Skill execution service."""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from ..models import (
    ExecutionSession,
    ExecutionStatus,
    ExecutionLog,
    ExecutionResult,
    ExecutionError,
    LogType,
    Message,
    MessageRole,
    ToolCall,
    ToolCallStatus,
    ModelConfig,
)
from ..opencode import OpencodeClient
from ..utils.config import get_settings
from .execution_storage import get_execution_storage
from .skill_service import get_skill_service


# Execution timeout in seconds (5 minutes)
EXECUTION_TIMEOUT = 300


class ExecutionService:
    """Service for executing skills using opencode runtime."""

    def __init__(self) -> None:
        self._client: Optional[OpencodeClient] = None
        self._active_sessions: dict[str, asyncio.Task] = {}

    def _get_client(self) -> OpencodeClient:
        """Get or create the opencode client."""
        if self._client is None:
            settings = get_settings()
            self._client = OpencodeClient(base_url=settings.opencode_server_url)
        return self._client

    async def start_execution(
        self,
        skill_id: str,
        prompt: str,
        model_config: Optional[ModelConfig] = None,
    ) -> ExecutionSession:
        """Start a new skill execution session.

        Args:
            skill_id: ID of the skill package to execute.
            prompt: User prompt to send to the skill.
            model_config: Optional model configuration.

        Returns:
            The created execution session.

        Raises:
            ValueError: If the skill package is not found or invalid.
        """
        # Verify skill exists and is valid
        skill_service = get_skill_service()
        package = skill_service.get_package(skill_id)

        if not package:
            raise ValueError(f"Skill package not found: {skill_id}")

        if package.validation_status.value != "valid":
            raise ValueError(f"Skill package is not valid: {package.validation_status}")

        # Create execution session
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        session = ExecutionSession(
            id=session_id,
            skill_id=skill_id,
            status=ExecutionStatus.PENDING,
            created_at=now,
            model_config=model_config,
            logs=[],
        )

        # Save session
        storage = get_execution_storage()
        storage.save(session)

        # Start execution in background
        task = asyncio.create_task(
            self._execute_skill(session_id, skill_id, prompt, model_config)
        )
        self._active_sessions[session_id] = task

        return session

    async def _execute_skill(
        self,
        session_id: str,
        skill_id: str,
        prompt: str,
        model_config: Optional[ModelConfig],
    ) -> None:
        """Execute a skill in the background.

        This method runs the actual execution and updates the session status.
        """
        storage = get_execution_storage()
        skill_service = get_skill_service()

        try:
            # Update status to running
            storage.update_status(session_id, ExecutionStatus.RUNNING)

            # Get skill content for context
            package = skill_service.get_package(skill_id)
            if not package or not package.metadata:
                raise ValueError("Skill package not found or has no metadata")

            # Build system prompt from skill
            skill_content = ""
            for file in package.files:
                if file.name == "SKILL.md" and file.content:
                    skill_content = file.content
                    break

            # Execute with timeout
            client = self._get_client()

            try:
                async with asyncio.timeout(EXECUTION_TIMEOUT):
                    # Create a new session with the skill context
                    opencode_session = await client.session.create(
                        system_prompt=skill_content,
                        model=model_config.model if model_config else None,
                    )

                    # Send the user prompt and stream responses
                    async for event in client.session.send_message(
                        opencode_session.id,
                        prompt,
                    ):
                        # Add log entry for each event
                        log = self._event_to_log(event)
                        if log:
                            session = storage.get(session_id)
                            if session:
                                session.logs.append(log)
                                storage.save(session)

                        # Check if cancelled
                        if session_id not in self._active_sessions:
                            break

                    # Mark as completed
                    session = storage.get(session_id)
                    if session and session.status == ExecutionStatus.RUNNING:
                        session.status = ExecutionStatus.COMPLETED
                        session.completed_at = datetime.now(timezone.utc)

                        # Extract result from logs
                        result_content = self._extract_result(session.logs)
                        if result_content:
                            session.result = ExecutionResult(
                                content=result_content,
                                tool_calls_count=sum(
                                    1 for log in session.logs
                                    if log.log_type == LogType.TOOL_CALL
                                ),
                            )

                        storage.save(session)

            except asyncio.TimeoutError:
                # Execution timed out
                session = storage.get(session_id)
                if session:
                    session.status = ExecutionStatus.FAILED
                    session.completed_at = datetime.now(timezone.utc)
                    session.error = ExecutionError(
                        code="TIMEOUT",
                        message=f"Execution timed out after {EXECUTION_TIMEOUT} seconds",
                    )
                    storage.save(session)

        except Exception as e:
            # Handle any other errors
            session = storage.get(session_id)
            if session:
                session.status = ExecutionStatus.FAILED
                session.completed_at = datetime.now(timezone.utc)
                session.error = ExecutionError(
                    code="EXECUTION_ERROR",
                    message=str(e),
                )
                storage.save(session)

        finally:
            # Remove from active sessions
            self._active_sessions.pop(session_id, None)

    def _event_to_log(self, event: dict) -> Optional[ExecutionLog]:
        """Convert an opencode event to an execution log entry."""
        event_type = event.get("type", "")
        timestamp = datetime.now(timezone.utc)

        if event_type == "message":
            role = event.get("role", "assistant")
            content = event.get("content", "")

            return ExecutionLog(
                timestamp=timestamp,
                log_type=LogType.MESSAGE,
                content=Message(
                    role=MessageRole(role),
                    content=content,
                ),
            )

        elif event_type == "tool_call":
            return ExecutionLog(
                timestamp=timestamp,
                log_type=LogType.TOOL_CALL,
                content=ToolCall(
                    id=event.get("id", ""),
                    name=event.get("name", ""),
                    arguments=event.get("arguments", {}),
                    status=ToolCallStatus.PENDING,
                ),
            )

        elif event_type == "tool_result":
            return ExecutionLog(
                timestamp=timestamp,
                log_type=LogType.TOOL_RESULT,
                content={
                    "tool_call_id": event.get("tool_call_id", ""),
                    "result": event.get("result", ""),
                },
            )

        elif event_type == "error":
            return ExecutionLog(
                timestamp=timestamp,
                log_type=LogType.ERROR,
                content={
                    "code": event.get("code", "UNKNOWN"),
                    "message": event.get("message", "Unknown error"),
                },
            )

        return None

    def _extract_result(self, logs: list[ExecutionLog]) -> Optional[str]:
        """Extract the final result content from execution logs."""
        # Find the last assistant message
        for log in reversed(logs):
            if log.log_type == LogType.MESSAGE:
                content = log.content
                if isinstance(content, Message) and content.role == MessageRole.ASSISTANT:
                    return content.content
                elif isinstance(content, dict) and content.get("role") == "assistant":
                    return content.get("content", "")
        return None

    async def cancel_execution(self, session_id: str) -> bool:
        """Cancel a running execution.

        Args:
            session_id: ID of the session to cancel.

        Returns:
            True if the execution was cancelled, False otherwise.
        """
        storage = get_execution_storage()
        session = storage.get(session_id)

        if not session:
            return False

        if session.status != ExecutionStatus.RUNNING:
            return False

        # Cancel the task
        task = self._active_sessions.pop(session_id, None)
        if task:
            task.cancel()

        # Update session status
        session.status = ExecutionStatus.CANCELLED
        session.completed_at = datetime.now(timezone.utc)
        storage.save(session)

        return True

    def get_session(self, session_id: str) -> Optional[ExecutionSession]:
        """Get an execution session by ID."""
        storage = get_execution_storage()
        return storage.get(session_id)

    def list_sessions(self, skill_id: Optional[str] = None) -> list[ExecutionSession]:
        """List execution sessions."""
        storage = get_execution_storage()
        return storage.list_all(skill_id)

    async def stream_logs(
        self,
        session_id: str,
    ) -> AsyncGenerator[ExecutionLog, None]:
        """Stream execution logs for a session.

        This yields logs as they are added to the session.
        """
        storage = get_execution_storage()
        last_index = 0

        while True:
            session = storage.get(session_id)
            if not session:
                break

            # Yield any new logs
            while last_index < len(session.logs):
                yield session.logs[last_index]
                last_index += 1

            # Check if session is complete
            if session.status in (
                ExecutionStatus.COMPLETED,
                ExecutionStatus.FAILED,
                ExecutionStatus.CANCELLED,
            ):
                break

            # Wait a bit before checking for more logs
            await asyncio.sleep(0.1)


# Global instance
_execution_service: Optional[ExecutionService] = None


def get_execution_service() -> ExecutionService:
    """Get the global execution service instance."""
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service
