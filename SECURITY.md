# Security Features Documentation

## Overview

This document describes the security enhancements implemented in the PassTheBytes Tools API to protect against common vulnerabilities and ensure safe operation.

## 1. Input Validation Middleware

### Purpose
Validates all incoming requests to prevent malicious or malformed data from reaching the application.

### Features
- **Content-Length Validation**: Rejects requests with negative or excessively large content-length headers
- **Request Size Limits**: Maximum request body size of 100 MB
- **Content-Type Validation**: Validates content-types for proper format

### Configuration
Located in: `backend/app/middleware/input_validation.py`

```python
MAX_REQUEST_SIZE = 100 * 1024 * 1024  # 100 MB
```

## 2. Rate Limiting

### Purpose
Prevents abuse and DoS attacks by limiting the number of requests per time period.

### Implemented Limits

| Endpoint | Rate Limit | Purpose |
|----------|------------|---------|
| `/api/png-to-pdf/convert` | 10/minute | Prevent PDF generation abuse |
| `/api/image-converter/convert-image` | 15/minute | Prevent image conversion abuse |
| `/api/youtube/info` | 30/minute | Prevent YouTube API abuse |
| `/api/youtube/download/{format}` | 5/minute | Prevent download abuse |
| `/api/youtube/playlist-info` | 20/minute | Prevent playlist info abuse |
| `/api/youtube/download-playlist` | 3/hour | Prevent large playlist abuse |
| `/api/youtube/download-zip` | 10/minute | Prevent zip download abuse |
| `/api/qr-code-generator/generate` | 20/minute | Prevent QR generation abuse |

### Configuration
Rate limiting is implemented using SlowAPI. The limits are defined per-endpoint using decorators:

```python
@router.post("/convert")
@limiter.limit("10/minute")
async def convert_png_to_pdf(request: Request, ...):
    ...
```

### Response
When rate limit is exceeded, the API returns:
- HTTP Status: `429 Too Many Requests`
- Headers include rate limit information

## 3. Audit Logging

### Purpose
Tracks all file operations and security-relevant events for monitoring and incident response.

### Logged Information
- **File Operations**: Upload, conversion, and download events
- **Client Information**: IP addresses (considering proxy headers)
- **Request Metadata**: Content-length, content-type
- **Response Information**: Status codes, processing time
- **Errors**: All 4xx and 5xx responses

### Log Format
```
2026-01-29 19:12:53 - AUDIT - File operation started: POST /api/png-to-pdf/convert - Client: 192.168.1.100 - Content-Length: 1024 - Content-Type: multipart/form-data
2026-01-29 19:12:54 - AUDIT - File operation completed: POST /api/png-to-pdf/convert - Status: 200 - Client: 192.168.1.100 - Time: 1.23s
```

### Configuration
Located in: `backend/app/middleware/audit_logging.py`

Audit logs are written to stdout and can be collected by log aggregation systems.

## 4. Content Security Policy (CSP) Headers

### Purpose
Prevents XSS attacks, clickjacking, and other code injection attacks.

### Implemented Headers

#### Content-Security-Policy
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
media-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

#### Other Security Headers
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-XSS-Protection**: `1; mode=block` - Enables XSS protection
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controls referrer information
- **Permissions-Policy**: Restricts browser features (geolocation, camera, etc.)
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` (production only)

### Configuration
Located in: `backend/app/middleware/security_headers.py`

## 5. Input Sanitization

### Purpose
Prevents path traversal, command injection, and other attacks through user-supplied strings.

### Features

#### Filename Sanitization
Located in: `backend/app/utils/__init__.py`

The `sanitize_filename()` function:
- Removes path separators (`/`, `\`)
- Removes parent directory references (`..`)
- Removes special shell characters (`;`, `|`, `&`, etc.)
- Allows only alphanumeric characters, spaces, hyphens, underscores, and dots
- Limits filename length
- Returns safe default for invalid input

Example:
```python
sanitize_filename("../../etc/passwd")  # Returns: "etc_passwd"
sanitize_filename("file;rm -rf /")     # Returns: "file_rm_-rf"
```

#### Parameter Validation
All endpoints validate user input using Pydantic models with custom validators:

**YouTube URLs**:
- Must be YouTube domain
- Maximum 2048 characters
- Video IDs validated against YouTube format (11 alphanumeric characters)

**QR Code Data**:
- URLs must start with http:// or https://
- Email addresses validated using Pydantic's EmailStr
- Phone numbers validated for allowed characters
- Colors validated for hex format (#RRGGBB)
- Text limited to reasonable lengths

**File Operations**:
- DPI range: 72-600
- File count limits (max 50 for PNG to PDF)
- File size limits (5-50 MB depending on endpoint)
- Allowed file types validated

## 6. Security Best Practices

### Password Generation
- Uses `secrets` module for cryptographically secure random generation
- No user input used in generation (only configuration)

### File Handling
- Temporary files stored in system temp directories
- Automatic cleanup via background tasks
- Scheduled cleanup every hour
- UUID-based filenames to prevent conflicts and prediction

### Path Traversal Prevention
- All file paths normalized and validated
- Base directory checks before file access
- User-supplied paths sanitized

### Command Injection Prevention
- No user input directly passed to shell commands
- Subprocess calls use list form (not shell=True)
- All filenames sanitized before use

## 7. Testing

### Test Coverage
Security features are tested in:
- `tests/test_middleware.py` - Middleware functionality
- `tests/test_sanitization.py` - Filename sanitization
- `tests/test_security_integration.py` - Integration tests
- `tests/test_input_validation.py` - Input validation

### Running Tests
```bash
cd backend
python -m pytest tests/ -v
```

## 8. Monitoring and Maintenance

### Log Monitoring
Monitor audit logs for:
- High rate limit violations
- Failed authentication attempts (if implemented)
- Unusual file operation patterns
- Error rate spikes

### Regular Reviews
- Review rate limits based on usage patterns
- Update CSP policies as needed
- Review and update input validation rules
- Keep dependencies updated for security patches

## 9. Future Enhancements

Recommended additional security measures:
- API key authentication for file operations
- User session management
- Enhanced DDoS protection
- File virus scanning integration
- Encrypted file storage
- Detailed access control lists (ACLs)

## 10. Incident Response

In case of security incident:
1. Review audit logs for affected operations
2. Identify attack vector from logged data
3. Block malicious IP addresses if needed
4. Update validation rules to prevent similar attacks
5. Document incident and update security measures

## Dependencies

Security-related dependencies:
- `slowapi==0.1.9` - Rate limiting
- `email-validator` - Email validation
- `werkzeug==3.1.5` - Secure filename utilities
- `pydantic` - Input validation

## Compliance

These security measures help meet requirements for:
- OWASP Top 10 protections
- Basic GDPR compliance (audit logging)
- Defense in depth strategy
- Secure development lifecycle (SDL)
