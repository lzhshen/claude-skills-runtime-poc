"""Execution API endpoints."""

import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..models import ExecutionSession, ModelConfig
from ..services.execution_service import get_execution_service
from ..utils.errors import InvalidRequestError, NotFoundError


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


router = APIRouter(prefix="/executions", tags=["executions"])


class ExecuteRequest(BaseModel):
    """Request body for skill execution."""

    prompt: str
    model: str | None = None
    provider: str | None = None


class ExecuteResponse(BaseModel):
    """Response for skill execution start."""

    session_id: str
    status: str


def _serialize_result(result) -> dict:
    """Serialize ExecutionResult to JSON-serializable dict."""
    if hasattr(result, "model_dump"):
        return result.model_dump()
    return result


def _serialize_error(error) -> dict:
    """Serialize ExecutionError to JSON-serializable dict."""
    if hasattr(error, "model_dump"):
        return error.model_dump()
    return error


@router.post("/skills/{skill_id}/execute", response_model=ExecuteResponse)
async def execute_skill(skill_id: str, body: ExecuteRequest) -> ExecuteResponse:
    """Start executing a skill with the given prompt.

    Returns a session ID that can be used to stream results.
    """
    service = get_execution_service()

    model_config = None
    if body.model or body.provider:
        model_config = ModelConfig(
            model_id=body.model,
            provider_id=body.provider,
        )

    try:
        session = await service.start_execution(
            skill_id=skill_id,
            prompt=body.prompt,
            model_config=model_config,
        )

        return ExecuteResponse(
            session_id=session.id,
            status=session.status.value,
        )

    except ValueError as e:
        raise InvalidRequestError(str(e)).to_http_exception()


@router.get("/{session_id}/stream")
async def stream_execution(session_id: str, debug: bool = False) -> StreamingResponse:
    """Stream execution logs as Server-Sent Events (SSE)."""
    service = get_execution_service()
    session = service.get_session(session_id)

    if not session:
        raise NotFoundError("执行会话", session_id).to_http_exception()

    async def event_generator():
        try:
            async for log in service.stream_logs(session_id, include_debug=debug):
                data = {
                    "timestamp": log.timestamp.isoformat(),
                    "type": log.log_type.value,
                    "content": _serialize_content(log.content),
                }
                yield f"data: {json.dumps(data, cls=DateTimeEncoder)}\n\n"

            final_session = service.get_session(session_id)
            if final_session:
                completion_data = {
                    "type": "complete",
                    "status": final_session.status.value,
                    "result": _serialize_result(final_session.result)
                    if final_session.result
                    else None,
                    "error": _serialize_error(final_session.error) if final_session.error else None,
                }
                yield f"data: {json.dumps(completion_data, cls=DateTimeEncoder)}\n\n"

        except Exception as e:
            error_data = {
                "type": "error",
                "message": str(e),
            }
            yield f"data: {json.dumps(error_data, cls=DateTimeEncoder)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{session_id}/cancel")
async def cancel_execution(session_id: str) -> dict:
    """Cancel a running execution."""
    service = get_execution_service()

    session = service.get_session(session_id)
    if not session:
        raise NotFoundError("执行会话", session_id).to_http_exception()

    success = await service.cancel_execution(session_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "CANNOT_CANCEL",
                    "message": "无法取消执行，会话可能已完成或已取消",
                }
            },
        )

    return {"success": True, "message": "执行已取消"}


@router.get("/{session_id}", response_model=ExecutionSession)
async def get_execution(session_id: str) -> ExecutionSession:
    """Get execution session details."""
    service = get_execution_service()
    session = service.get_session(session_id)

    if not session:
        raise NotFoundError("执行会话", session_id).to_http_exception()

    return session


@router.get("/{session_id}/logs")
async def get_execution_logs(session_id: str) -> dict:
    """Get all logs for an execution session."""
    service = get_execution_service()
    session = service.get_session(session_id)

    if not session:
        raise NotFoundError("执行会话", session_id).to_http_exception()

    return {
        "session_id": session_id,
        "logs": [
            {
                "timestamp": log.timestamp.isoformat(),
                "type": log.log_type.value,
                "content": _serialize_content(log.content),
            }
            for log in session.logs
        ],
    }


@router.get("")
async def list_executions(skill_id: str | None = None) -> dict:
    """List all execution sessions."""
    service = get_execution_service()
    sessions = service.list_sessions(skill_id)

    return {
        "sessions": [
            {
                "id": s.id,
                "skill_id": s.skill_package_id,
                "status": s.status.value,
                "created_at": s.started_at.isoformat(),
                "completed_at": s.ended_at.isoformat() if s.ended_at else None,
            }
            for s in sessions
        ],
    }


def _serialize_content(content) -> dict:
    """Serialize log content to a JSON-serializable dict."""
    if hasattr(content, "model_dump"):
        return content.model_dump()
    elif isinstance(content, dict):
        return content
    else:
        return {"value": str(content)}
