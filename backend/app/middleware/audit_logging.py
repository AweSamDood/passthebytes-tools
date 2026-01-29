"""
Audit logging middleware for tracking file operations and security events.
"""
import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Configure audit logger
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# Create a separate handler for audit logs
audit_handler = logging.StreamHandler()
audit_formatter = logging.Formatter(
    '%(asctime)s - AUDIT - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
audit_handler.setFormatter(audit_formatter)
audit_logger.addHandler(audit_handler)

# Prevent propagation to root logger to avoid duplicate logs
audit_logger.propagate = False


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log file operations and security-relevant events.
    
    Logs:
    - File uploads with size and type information
    - File conversions and processing
    - File downloads
    - Client IP addresses
    - Response status codes
    - Processing duration
    """
    
    # Endpoints that involve file operations
    FILE_OPERATION_PATHS = [
        "/api/png-to-pdf/convert",
        "/api/image-converter/convert-image",
        "/api/youtube/download",
        "/api/youtube/download-playlist",
        "/api/youtube/download-zip",
        "/api/qr-code-generator/generate",
    ]
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get client IP (considering proxy headers)
        client_ip = self._get_client_ip(request)
        
        # Log file upload operations
        if self._is_file_operation(request):
            await self._log_file_operation(request, client_ip)
        
        # Process request
        response: Response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log completed file operations
        if self._is_file_operation(request):
            self._log_completion(request, response, client_ip, process_time)
        
        # Log security-relevant errors (4xx, 5xx)
        if response.status_code >= 400:
            audit_logger.warning(
                f"Error response: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Client: {client_ip} - "
                f"Time: {process_time:.2f}s"
            )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address, considering proxy headers."""
        # Check X-Forwarded-For header (common in proxied environments)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct connection IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _is_file_operation(self, request: Request) -> bool:
        """Check if the request is a file operation."""
        path = request.url.path
        return any(path.startswith(op_path) for op_path in self.FILE_OPERATION_PATHS)
    
    async def _log_file_operation(self, request: Request, client_ip: str):
        """Log file upload/operation details."""
        content_length = request.headers.get("content-length", "unknown")
        content_type = request.headers.get("content-type", "unknown")
        
        audit_logger.info(
            f"File operation started: {request.method} {request.url.path} - "
            f"Client: {client_ip} - "
            f"Content-Length: {content_length} - "
            f"Content-Type: {content_type}"
        )
    
    def _log_completion(
        self, request: Request, response: Response, client_ip: str, process_time: float
    ):
        """Log completed file operation."""
        audit_logger.info(
            f"File operation completed: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Client: {client_ip} - "
            f"Time: {process_time:.2f}s"
        )
