"""Custom DRF exception handler that always returns JSON.

Without this, unhandled errors (for example a missing table on a fresh
database) fall through to Django's HTML 500 page, and the browser sees the
generic "Request failed." message instead of the real cause.
"""

import logging

from django.db import DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    detail = "An unexpected server error occurred."
    if isinstance(exc, DatabaseError):
        detail = f"Database error: {exc}"

    logger.exception("Unhandled API exception", exc_info=exc)
    return Response(
        {"detail": detail, "error_type": type(exc).__name__},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )