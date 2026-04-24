from fastapi import FastAPI, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import HTTPException
from fastapi.requests import Request
from fastapi.responses import Response


class InternalErrorHandler(BaseHTTPMiddleware):
    """
    Catches any exception and raises an HTTP Exception with an Internal Server Error status.

    Methods:
        dispatch: Runs the middleware action.
    """
    def __init__(self, app: FastAPI) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response | HTTPException:
        try:
            return await call_next(request)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal Exception: {str(e)}"
            )