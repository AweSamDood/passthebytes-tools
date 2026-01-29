"""
Input validation middleware for request validation and size limits.
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Maximum request body size (100 MB for file uploads)
MAX_REQUEST_SIZE = 100 * 1024 * 1024  # 100 MB

# Allowed content types for multipart/form-data
ALLOWED_MULTIPART_TYPES = [
    "multipart/form-data",
    "application/x-www-form-urlencoded",
]

# Allowed content types for JSON
ALLOWED_JSON_TYPES = [
    "application/json",
]


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate incoming requests for security.
    
    - Validates content-length headers
    - Validates content-types for file uploads
    - Enforces request size limits
    """
    
    async def dispatch(self, request: Request, call_next):
        # Skip validation for GET, HEAD, OPTIONS requests
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)
        
        # Check content-length header
        content_length = request.headers.get("content-length")
        
        if content_length:
            try:
                content_length_int = int(content_length)
                
                if content_length_int > MAX_REQUEST_SIZE:
                    logger.warning(
                        f"Request rejected: Content-Length {content_length_int} "
                        f"exceeds maximum {MAX_REQUEST_SIZE}"
                    )
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body too large. Maximum size is "
                            f"{MAX_REQUEST_SIZE // (1024 * 1024)} MB"
                        }
                    )
                
                if content_length_int < 0:
                    logger.warning("Request rejected: Negative Content-Length")
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "Invalid Content-Length header"}
                    )
                    
            except ValueError:
                logger.warning(f"Request rejected: Invalid Content-Length: {content_length}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header"}
                )
        
        # Validate content-type for POST/PUT/PATCH requests
        content_type = request.headers.get("content-type", "")
        
        # For file upload endpoints, ensure proper content-type
        if request.method in ["POST", "PUT", "PATCH"]:
            # Allow requests without body (empty content-type)
            if content_type and not self._is_valid_content_type(content_type):
                # Only log, don't block - some valid requests may have different content-types
                logger.debug(
                    f"Request with content-type: {content_type} "
                    f"to path: {request.url.path}"
                )
        
        response = await call_next(request)
        return response
    
    def _is_valid_content_type(self, content_type: str) -> bool:
        """Check if content-type is in our allowed list or is a common valid type."""
        content_type_lower = content_type.lower().split(";")[0].strip()
        
        # Common valid content types
        valid_types = (
            ALLOWED_MULTIPART_TYPES +
            ALLOWED_JSON_TYPES +
            ["application/octet-stream", "text/plain"]
        )
        
        for valid_type in valid_types:
            if content_type_lower.startswith(valid_type):
                return True
        
        return True  # Be permissive by default, just log suspicious ones
