"""Skill execution service using OpenCode SDK."""

import asyncio
import json
import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from opencode_sdk_new import AsyncOpencodeSDKNew
from opencode_sdk_new.types.event import (
    Event,
    EventMessagePartUpdated,
    EventMessageUpdated,
    EventSessionError,
    EventSessionIdle,
    EventSessionStatus,
)

from ..models import (
    ErrorLogContent,
    ExecutionError,
    ExecutionLog,
    ExecutionResult,
    ExecutionSession,
    ExecutionStatus,
    LogType,
    Message,
    MessageLogContent,
    MessageRole,
    ModelConfig,
)
from ..utils.opencode import get_opencode_client
from .execution_storage import get_execution_storage
from .skill_service import get_skill_service

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

EXECUTION_TIMEOUT = 300


class ExecutionService:
    def __init__(self) -> None:
        self._active_sessions: dict[str, asyncio.Task[None]] = {}

    def _get_client(self) -> AsyncOpencodeSDKNew:
        return get_opencode_client()

    async def start_execution(
        self,
        skill_id: str,
        prompt: str,
        model_config: ModelConfig | None = None,
    ) -> ExecutionSession:
        skill_service = get_skill_service()
        package = skill_service.get_package(skill_id)

        if not package:
            raise ValueError(f"Skill package not found: {skill_id}")

        if package.validation_status.value != "valid":
            raise ValueError(f"Skill package is not valid: {package.validation_status}")

        session_id = str(uuid.uuid4())
        now = datetime.now(UTC)

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

        storage = get_execution_storage()
        storage.save(session)

        task = asyncio.create_task(self._execute_skill(session_id, skill_id, prompt, model_config))
        self._active_sessions[session_id] = task

        return session

    async def _execute_skill(
        self,
        session_id: str,
        skill_id: str,
        prompt: str,
        model_config: ModelConfig | None,
    ) -> None:
        storage = get_execution_storage()
        skill_service = get_skill_service()

        try:
            storage.update_status(session_id, ExecutionStatus.RUNNING)

            package = skill_service.get_package(skill_id)
            if not package or not package.metadata:
                raise ValueError("Skill package not found or has no metadata")

            skill_content = ""
            for file in package.files:
                if file.name == "SKILL.md" and file.content:
                    skill_content = file.content
                    break

            client = self._get_client()
            project_dir = os.getcwd()

            try:
                async with asyncio.timeout(EXECUTION_TIMEOUT):
                    opencode_session = await client.session.create(
                        directory=project_dir,
                        title=f"Skill: {package.metadata.name}",
                    )

                    event_stream = await client.event.get_events(directory=project_dir)

                    model_param = None
                    if model_config and model_config.model_id:
                        model_param = {
                            "model_id": model_config.model_id,
                            "provider_id": model_config.provider_id or "local",
                        }

                    await client.session.send_async_message(
                        opencode_session.id,
                        parts=[{"type": "text", "text": prompt}],
                        system=skill_content,
                        model=model_param,
                        directory=project_dir,
                    )

                    message_role_map: dict[str, str] = {}
                    message_index_map: dict[str, int] = {}

                    async for event in event_stream:
                        if self._is_session_complete(event, opencode_session.id):
                            break

                        if self._is_session_error(event, opencode_session.id):
                            error_msg = self._extract_error_message(event)
                            raise RuntimeError(f"Session error: {error_msg}")

                        log = self._typed_event_to_log(
                            event, session_id, message_role_map, message_index_map
                        )
                        if log:
                            current_session = storage.get(session_id)
                            if current_session:
                                msg_id = self._get_message_id_from_event(event)
                                if msg_id and msg_id in message_index_map:
                                    idx = message_index_map[msg_id]
                                    if idx < len(current_session.logs):
                                        current_session.logs[idx] = log
                                else:
                                    if msg_id:
                                        message_index_map[msg_id] = len(current_session.logs)
                                    current_session.logs.append(log)
                                storage.save(current_session)

                    final_session = storage.get(session_id)
                    if final_session and final_session.status == ExecutionStatus.RUNNING:
                        final_session.status = ExecutionStatus.COMPLETED
                        final_session.ended_at = datetime.now(UTC)

                        result_content = self._extract_result(final_session.logs)
                        if result_content:
                            final_session.result = ExecutionResult(
                                response=result_content,
                                tool_calls_count=sum(
                                    1
                                    for log in final_session.logs
                                    if log.log_type == LogType.TOOL_CALL
                                ),
                            )

                        storage.save(final_session)

            except TimeoutError:
                error_session = storage.get(session_id)
                if error_session:
                    error_session.status = ExecutionStatus.FAILED
                    error_session.ended_at = datetime.now(UTC)
                    error_session.error = ExecutionError(
                        code="TIMEOUT",
                        message=f"Execution timed out after {EXECUTION_TIMEOUT} seconds",
                    )
                    storage.save(error_session)

        except Exception as e:
            error_session = storage.get(session_id)
            if error_session:
                error_session.status = ExecutionStatus.FAILED
                error_session.ended_at = datetime.now(UTC)
                error_session.error = ExecutionError(
                    code="EXECUTION_ERROR",
                    message=str(e),
                )
                storage.save(error_session)

        finally:
            self._active_sessions.pop(session_id, None)

    def _is_session_complete(self, event: Event, session_id: str) -> bool:
        if isinstance(event, EventSessionIdle):
            return event.properties.session_id == session_id
        if isinstance(event, EventSessionStatus):
            if event.properties.session_id == session_id:
                status = event.properties.status
                if hasattr(status, "type") and status.type == "idle":
                    return True
        return False

    def _is_session_error(self, event: Event, session_id: str) -> bool:
        if isinstance(event, EventSessionError):
            props = event.properties
            return props.session_id == session_id and props.error is not None
        return False

    def _extract_error_message(self, event: Event) -> str:
        if isinstance(event, EventSessionError) and event.properties.error:
            error = event.properties.error
            if hasattr(error, "message"):
                return str(error.message)
            return str(error)
        return "Unknown error"

    def _get_message_id_from_event(self, event: Event) -> str | None:
        if isinstance(event, EventMessageUpdated):
            return event.properties.info.id
        if isinstance(event, EventMessagePartUpdated):
            return event.properties.part.message_id
        return None

    def _typed_event_to_log(
        self,
        event: Event,
        session_id: str,
        message_role_map: dict[str, str],
        message_index_map: dict[str, int],
    ) -> ExecutionLog | None:
        timestamp = datetime.now(UTC)

        if isinstance(event, EventMessageUpdated):
            msg_info = event.properties.info
            message_id = msg_info.id
            role = msg_info.role if hasattr(msg_info, "role") else "assistant"
            if message_id:
                message_role_map[message_id] = role
            return None

        if isinstance(event, EventMessagePartUpdated):
            part = event.properties.part
            message_id = part.message_id if hasattr(part, "message_id") else ""
            role = message_role_map.get(message_id, "assistant")

            content = ""
            if hasattr(part, "text"):
                content = part.text or ""
            elif hasattr(part, "content"):
                content = part.content or ""

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
            return None

        if isinstance(event, EventSessionError):
            if event.properties.error:
                error = event.properties.error
                error_msg = str(error.message) if hasattr(error, "message") else str(error)
                return ExecutionLog(
                    session_id=session_id,
                    timestamp=timestamp,
                    log_type=LogType.ERROR,
                    content=ErrorLogContent(
                        error=ExecutionError(
                            code="SESSION_ERROR",
                            message=error_msg,
                        )
                    ),
                )
            return None

        event_type = getattr(event, "type", "")
        if event_type and self._is_internal_event(event_type):
            return None

        return None

    def _is_internal_event(self, event_type: str) -> bool:
        return event_type in INTERNAL_EVENT_TYPES

    def _is_system_log_internal(self, log: ExecutionLog) -> bool:
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

    def _extract_result(self, logs: list[ExecutionLog]) -> str | None:
        for log in reversed(logs):
            if log.log_type == LogType.MESSAGE:
                content = log.content
                if isinstance(content, MessageLogContent):
                    msg = content.message
                    if msg.role == MessageRole.ASSISTANT:
                        return msg.content
                elif isinstance(content, dict) and content.get("role") == "assistant":
                    return content.get("content", "")
        return None

    async def cancel_execution(self, session_id: str) -> bool:
        storage = get_execution_storage()
        session = storage.get(session_id)

        if not session:
            return False

        if session.status != ExecutionStatus.RUNNING:
            return False

        task = self._active_sessions.pop(session_id, None)
        if task:
            task.cancel()

        session.status = ExecutionStatus.CANCELLED
        session.ended_at = datetime.now(UTC)
        storage.save(session)

        return True

    def get_session(self, session_id: str) -> ExecutionSession | None:
        storage = get_execution_storage()
        return storage.get(session_id)

    def list_sessions(self, skill_id: str | None = None) -> list[ExecutionSession]:
        storage = get_execution_storage()
        return storage.list_all(skill_id)

    async def stream_logs(
        self,
        session_id: str,
        include_debug: bool = False,
    ) -> AsyncGenerator[ExecutionLog, None]:
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

            if session.status in (
                ExecutionStatus.COMPLETED,
                ExecutionStatus.FAILED,
                ExecutionStatus.CANCELLED,
            ):
                break

            await asyncio.sleep(0.1)

    def _log_content_hash(self, log: ExecutionLog) -> str:
        if log.log_type == LogType.MESSAGE:
            content = log.content
            if hasattr(content, "message"):
                msg = content.message
                if hasattr(msg, "content"):
                    return f"msg:{msg.role}:{msg.content}"
        return f"{log.log_type}:{log.timestamp.isoformat()}"


_execution_service: ExecutionService | None = None


def get_execution_service() -> ExecutionService:
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service
