"""Error handling utilities and exception classes."""

from typing import Any, Optional

from fastapi import HTTPException, status


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert error to dictionary for API response."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                **self.details,
            }
        }

    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict()["error"],
        )


class NotFoundError(AppError):
    """Resource not found error."""

    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource}不存在",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "id": resource_id},
        )


class ValidationError(AppError):
    """Validation error."""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"field": field} if field else {},
        )


class FileTooLargeError(AppError):
    """File size exceeds limit error."""

    def __init__(self, max_size_mb: int):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"文件大小超过 {max_size_mb}MB 限制",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class InvalidRequestError(AppError):
    """Invalid request error."""

    def __init__(self, message: str):
        super().__init__(
            code="INVALID_REQUEST",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class InvalidSkillError(AppError):
    """Invalid skill package error."""

    def __init__(self, message: str = "技能包验证未通过，无法执行"):
        super().__init__(
            code="INVALID_SKILL",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class BinaryFileError(AppError):
    """Cannot edit binary file error."""

    def __init__(self):
        super().__init__(
            code="BINARY_FILE",
            message="无法编辑二进制文件",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class OpencodeUnavailableError(AppError):
    """OpenCode server unavailable error."""

    def __init__(self, message: str = "无法连接到 opencode Server"):
        super().__init__(
            code="OPENCODE_UNAVAILABLE",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class AlreadyCompletedError(AppError):
    """Execution already completed error."""

    def __init__(self):
        super().__init__(
            code="ALREADY_COMPLETED",
            message="执行已完成，无法取消",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class ExecutionTimeoutError(AppError):
    """Execution timeout error."""

    def __init__(self, timeout_seconds: int):
        super().__init__(
            code="TIMEOUT",
            message=f"执行超时（{timeout_seconds // 60}分钟）",
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
        )
