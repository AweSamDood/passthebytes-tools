"""
Utility functions for the PassTheBytes Tools application.
"""
import re


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize a filename to prevent path traversal and command injection attacks.
    
    This function:
    - Removes path separators and parent directory references
    - Allows only alphanumeric characters, spaces, hyphens, underscores, and dots
    - Prevents leading/trailing dots and spaces
    - Limits filename length
    - Returns a safe default if sanitization results in empty string
    
    Args:
        filename: The filename to sanitize
        max_length: Maximum allowed length for the filename (default: 255)
    
    Returns:
        A sanitized filename safe for file operations
        
    Examples:
        >>> sanitize_filename("../../etc/passwd")
        'etc_passwd'
        >>> sanitize_filename("file;rm -rf.pdf")
        'file_rm_-rf.pdf'
        >>> sanitize_filename("normal_file.pdf")
        'normal_file.pdf'
    """
    if not filename or not isinstance(filename, str):
        return "unnamed_file"
    
    # Remove any path separators and parent directory references
    filename = filename.replace('/', '_').replace('\\', '_')
    filename = filename.replace('..', '_')
    
    # Remove any characters that are not alphanumeric, space, dash, underscore, or dot
    # This prevents command injection via special shell characters
    filename = re.sub(r'[^a-zA-Z0-9\s\-_\.]', '_', filename)
    
    # Replace multiple underscores/spaces with single ones
    filename = re.sub(r'[_\s]+', '_', filename)
    
    # Remove leading/trailing dots and spaces (can cause issues on some systems)
    filename = filename.strip('. ')
    
    # Remove leading and trailing underscores that may have been created during sanitization
    filename = filename.strip('_')
    
    # Check if we have a valid filename after sanitization
    # Files starting with dot (hidden files) or only extension are not valid
    if not filename or filename.startswith('.'):
        return "unnamed_file"
    
    # Limit length
    if len(filename) > max_length:
        # Try to preserve extension
        parts = filename.rsplit('.', 1)
        if len(parts) == 2 and len(parts[1]) <= 10:
            # Has extension
            name_part = parts[0][:max_length - len(parts[1]) - 1]
            filename = f"{name_part}.{parts[1]}"
        else:
            filename = filename[:max_length]
    
    return filename
