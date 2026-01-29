from typing import Optional, Union

from pydantic import BaseModel, Field, field_validator, EmailStr
import re


class URLData(BaseModel):
    url: str
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        # Basic URL validation - must start with http:// or https://
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        # Check maximum length to prevent abuse
        if len(v) > 2048:
            raise ValueError("URL too long (max 2048 characters)")
        return v


class TextData(BaseModel):
    text: str
    
    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        """Validate text length."""
        if len(v) > 4000:
            raise ValueError("Text too long (max 4000 characters)")
        return v


class WiFiData(BaseModel):
    ssid: str
    password: str
    security: str
    hidden: bool
    
    @field_validator("ssid")
    @classmethod
    def validate_ssid(cls, v: str) -> str:
        """Validate SSID."""
        if len(v) > 32:
            raise ValueError("SSID too long (max 32 characters)")
        if not v.strip():
            raise ValueError("SSID cannot be empty")
        return v
    
    @field_validator("security")
    @classmethod
    def validate_security(cls, v: str) -> str:
        """Validate security type."""
        valid_types = ["WPA", "WPA2", "WEP", "nopass"]
        if v not in valid_types:
            raise ValueError(f"Security must be one of {valid_types}")
        return v


class EmailData(BaseModel):
    email: EmailStr  # Use Pydantic's built-in email validation
    subject: Optional[str] = None
    body: Optional[str] = None
    
    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: Optional[str]) -> Optional[str]:
        """Validate email subject."""
        if v and len(v) > 500:
            raise ValueError("Subject too long (max 500 characters)")
        return v
    
    @field_validator("body")
    @classmethod
    def validate_body(cls, v: Optional[str]) -> Optional[str]:
        """Validate email body."""
        if v and len(v) > 2000:
            raise ValueError("Body too long (max 2000 characters)")
        return v


class ContactData(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: EmailStr  # Use Pydantic's built-in email validation
    company: Optional[str] = None
    job_title: Optional[str] = None
    website: Optional[str] = None
    
    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name fields."""
        if not v.strip():
            raise ValueError("Name cannot be empty")
        if len(v) > 100:
            raise ValueError("Name too long (max 100 characters)")
        return v
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number."""
        # Basic phone validation - allow digits, spaces, +, -, (, )
        if not re.match(r'^[\d\s\+\-\(\)]+$', v):
            raise ValueError("Phone number contains invalid characters")
        if len(v) > 20:
            raise ValueError("Phone number too long (max 20 characters)")
        return v
    
    @field_validator("website")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        """Validate website URL."""
        if v and not v.startswith(("http://", "https://")):
            raise ValueError("Website must start with http:// or https://")
        if v and len(v) > 2048:
            raise ValueError("Website URL too long (max 2048 characters)")
        return v


class QRCustomization(BaseModel):
    size: int = Field(default=400, ge=200, le=2000)
    foreground_color: str = "#000000"
    background_color: str = "#FFFFFF"
    error_correction: str = "M"  # L, M, Q, H
    border_size: int = 4
    corner_style: str = "square"  # square, rounded
    
    @field_validator("foreground_color", "background_color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate hex color format."""
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Color must be in hex format (e.g., #000000)")
        return v
    
    @field_validator("error_correction")
    @classmethod
    def validate_error_correction(cls, v: str) -> str:
        """Validate error correction level."""
        if v not in ["L", "M", "Q", "H"]:
            raise ValueError("Error correction must be L, M, Q, or H")
        return v
    
    @field_validator("border_size")
    @classmethod
    def validate_border_size(cls, v: int) -> int:
        """Validate border size."""
        if not 0 <= v <= 20:
            raise ValueError("Border size must be between 0 and 20")
        return v


class QRRequest(BaseModel):
    qr_type: str
    content: Union[URLData, TextData, WiFiData, ContactData, EmailData]
    customization: QRCustomization
    logo: Optional[str] = None
