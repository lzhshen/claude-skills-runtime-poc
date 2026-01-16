"""Skill execution service."""

import asyncio
import json
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
    SystemLogContent,
    MessageLogContent,
    ToolCallLogContent,
    ToolResultLogContent,
    ErrorLogContent,
)
from ..models.log_content import (
    ErrorLogContent,
    MessageLogContent,
    ToolCallLogContent,
    ToolResultLogContent,
)
from ..opencode import OpencodeClient


# Internal protocol event types that should be filtered out for normal users
# These are OpenCode WebSocket protocol messages, not user-visible content
INTERNAL_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "server.connected",
        "server.heartbeat",
        "session.created",
        "session.updated",
        "session.status",
        "session.diff",
        "session.idle",
        "message.updated",
        "message.part.updated",
        "tui.toast.show",
        "tui.toast.hide",
    }
)
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
            skill_package_id=skill_id,
            skill_name=package.metadata.name if package.metadata else str(package.id),
            user_prompt=prompt,
            status=ExecutionStatus.PENDING,
            started_at=now,
            model=model_config,
            logs=[],
        )

        # Save session
        storage = get_execution_storage()
        storage.save(session)

        # Start execution in background
        task = asyncio.create_task(self._execute_skill(session_id, skill_id, prompt, model_config))
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
                        model=model_config.model_id if model_config else None,
                    )

                    # Start streaming events in background
                    stream_queue = asyncio.Queue()

                    async def consume_events():
                        try:
                            async for evt in client.events.subscribe_session(opencode_session.id):
                                await stream_queue.put(evt)
                        except Exception as e:
                            print(f"Error in event stream: {e}")
                        finally:
                            await stream_queue.put(None)  # Signal end

                    stream_task = asyncio.create_task(consume_events())

                    # Send the user prompt
                    # Note: prompt() might wait for generation if not no_reply=True.
                    # We want to see events as they happen, so we might want no_reply=True?
                    # Or just fire and forget if prompt() returns result at end?
                    # Assuming prompt() blocks until completion, we should run it concurrently
                    # if we want to process events in real-time, OR just wait for it.
                    # But we need to save logs *as they come in*.

                    # We send prompt and ignore result here, relying on events?
                    # But prompt might block.
                    prompt_task = asyncio.create_task(
                        client.session.prompt(opencode_session.id, prompt)
                    )

                    message_index_map: dict[str, int] = {}
                    message_role_map: dict[str, str] = {}
                    session_idle = False

                    while not session_idle:
                        try:
                            event = await asyncio.wait_for(
                                stream_queue.get(),
                                timeout=30.0,
                            )
                        except asyncio.TimeoutError:
                            continue

                        if event is None:
                            break

                        try:
                            event_data = event.json()
                        except json.JSONDecodeError:
                            continue
                        if not event_data:
                            continue

                        event_type = event_data.get("type", "")
                        properties = event_data.get("properties", {})

                        if event_type == "session.idle":
                            session_idle = True
                        elif event_type == "session.status":
                            status = properties.get("status", {})
                            if status.get("type") == "idle":
                                session_idle = True

                        if event_type in ["message.updated", "message.part.updated"]:
                            if event_type == "message.updated":
                                msg_info = properties.get("info", {})
                                message_id = msg_info.get("id", "")
                                role = msg_info.get("role", "assistant")
                                if message_id:
                                    message_role_map[message_id] = role
                            else:
                                part_info = properties.get("part", {})
                                message_id = part_info.get("messageID", "")
                                role = message_role_map.get(message_id, "assistant")

                            log = self._event_to_log(
                                event_data, session_id, include_internal=True, role=role
                            )
                            if log:
                                session = storage.get(session_id)
                                if session:
                                    if message_id and message_id in message_index_map:
                                        idx = message_index_map[message_id]
                                        if idx < len(session.logs):
                                            session.logs[idx] = log
                                    else:
                                        if message_id:
                                            message_index_map[message_id] = len(session.logs)
                                        session.logs.append(log)
                                    storage.save(session)

                        elif event_type not in ["session.idle", "session.status"]:
                            log = self._event_to_log(event_data, session_id, include_internal=False)
                            if log:
                                session = storage.get(session_id)
                                if session:
                                    session.logs.append(log)
                                    storage.save(session)

                    try:
                        await asyncio.wait_for(prompt_task, timeout=5.0)
                    except asyncio.TimeoutError:
                        pass

                    # Mark as completed
                    session = storage.get(session_id)
                    if session and session.status == ExecutionStatus.RUNNING:
                        session.status = ExecutionStatus.COMPLETED
                        session.ended_at = datetime.now(timezone.utc)

                        # Extract result from logs
                        result_content = self._extract_result(session.logs)
                        if result_content:
                            session.result = ExecutionResult(
                                response=result_content,
                                tool_calls_count=sum(
                                    1 for log in session.logs if log.log_type == LogType.TOOL_CALL
                                ),
                            )

                        storage.save(session)

            except asyncio.TimeoutError:
                # Execution timed out
                session = storage.get(session_id)
                if session:
                    session.status = ExecutionStatus.FAILED
                    session.ended_at = datetime.now(timezone.utc)
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
                session.ended_at = datetime.now(timezone.utc)
                session.error = ExecutionError(
                    code="EXECUTION_ERROR",
                    message=str(e),
                )
                storage.save(session)

        finally:
            # Remove from active sessions
            self._active_sessions.pop(session_id, None)

    def _is_internal_event(self, event_type: str) -> bool:
        """Check if an event type is an internal protocol message."""
        return event_type in INTERNAL_EVENT_TYPES

    def _is_system_log_internal(self, log: ExecutionLog) -> bool:
        """Check if a SYSTEM log contains internal protocol data."""
        if log.log_type != LogType.SYSTEM:
            return False
        content = log.content
        if hasattr(content, "text"):
            try:
                event_data = json.loads(content.text)
                event_type = event_data.get("type", "")
                return self._is_internal_event(event_type)
            except (json.JSONDecodeError, AttributeError):
                pass
        return False

    def _event_to_log(
        self,
        event: dict,
        session_id: str,
        include_internal: bool = False,
        role: str = "assistant",
    ) -> Optional[ExecutionLog]:
        """Convert an opencode event to an execution log entry.

        Args:
            event: The raw event data from OpenCode.
            session_id: The execution session ID.
            include_internal: If True, include internal protocol events as SYSTEM logs.
            role: The message role (user/assistant) for message events.

        Returns:
            ExecutionLog if the event should be logged, None otherwise.
        """
        event_type = event.get("type", "")
        properties = event.get("properties", {})
        timestamp = datetime.now(timezone.utc)

        if event_type in ["message.updated", "message.part.updated"]:
            content = ""

            info = properties.get("info", {})
            part = properties.get("part", {})

            if "text" in part:
                content = part["text"]
            elif "content" in part:
                content = part["content"]

            if not content and "content" in info:
                content = info["content"]

            if content and content.strip():
                return ExecutionLog(
                    session_id=session_id,
                    timestamp=timestamp,
                    log_type=LogType.MESSAGE,
                    content=MessageLogContent(
                        message=Message(
                            role=MessageRole(role),
                            content=content,
                        )
                    ),
                )
            # No content extracted from message event - skip it
            # (don't fall through to SYSTEM log creation)
            return None

        elif event_type == "tool_call":
            return ExecutionLog(
                session_id=session_id,
                timestamp=timestamp,
                log_type=LogType.TOOL_CALL,
                content=ToolCallLogContent(
                    tool_call=ToolCall(
                        id=event.get("id", ""),
                        name=event.get("name", ""),
                        arguments=event.get("arguments", {}),
                        status=ToolCallStatus.PENDING,
                    )
                ),
            )

        elif event_type == "tool_result":
            return ExecutionLog(
                session_id=session_id,
                timestamp=timestamp,
                log_type=LogType.TOOL_RESULT,
                content=ToolResultLogContent(
                    tool_call_id=event.get("tool_call_id", ""),
                    result=event.get("result", ""),
                ),
            )

        elif event_type == "error":
            return ExecutionLog(
                session_id=session_id,
                timestamp=timestamp,
                log_type=LogType.ERROR,
                content=ErrorLogContent(
                    error=ExecutionError(
                        code=event.get("code", "UNKNOWN"),
                        message=event.get("message", "Unknown error"),
                    )
                ),
            )

        if self._is_internal_event(event_type):
            if not include_internal:
                return None

        return ExecutionLog(
            session_id=session_id,
            timestamp=timestamp,
            log_type=LogType.SYSTEM,
            content=SystemLogContent(text=json.dumps(event)),
        )

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
        session.ended_at = datetime.now(timezone.utc)
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
        include_debug: bool = False,
    ) -> AsyncGenerator[ExecutionLog, None]:
        """Stream execution logs for a session."""
        storage = get_execution_storage()
        sent_logs: dict[int, str] = {}

        while True:
            session = storage.get(session_id)
            if not session:
                break

            for idx, log in enumerate(session.logs):
                if not include_debug and log.log_type == LogType.SYSTEM:
                    if self._is_system_log_internal(log):
                        continue

                log_hash = self._log_content_hash(log)
                if idx not in sent_logs or sent_logs[idx] != log_hash:
                    sent_logs[idx] = log_hash
                    yield log

            # Check if session is complete
            if session.status in (
                ExecutionStatus.COMPLETED,
                ExecutionStatus.FAILED,
                ExecutionStatus.CANCELLED,
            ):
                break

            # Wait a bit before checking for more logs
            await asyncio.sleep(0.1)

    def _log_content_hash(self, log: ExecutionLog) -> str:
        """Generate a hash of log content for change detection."""
        if log.log_type == LogType.MESSAGE:
            content = log.content
            if hasattr(content, "message"):
                msg = content.message
                if hasattr(msg, "content"):
                    return f"msg:{msg.role}:{msg.content}"
        return f"{log.log_type}:{log.timestamp.isoformat()}"


# Global instance
_execution_service: Optional[ExecutionService] = None


def get_execution_service() -> ExecutionService:
    """Get the global execution service instance."""
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service
