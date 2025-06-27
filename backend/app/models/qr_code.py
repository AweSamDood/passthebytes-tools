from pydantic import BaseModel, Field
from typing import Optional, Union

class URLData(BaseModel):
    url: str

class TextData(BaseModel):
    text: str

class WiFiData(BaseModel):
    ssid: str
    password: str
    security: str
    hidden: bool

class EmailData(BaseModel):
    email: str
    subject: Optional[str] = None
    body: Optional[str] = None

class ContactData(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: str
    company: Optional[str] = None
    job_title: Optional[str] = None
    website: Optional[str] = None

class QRCustomization(BaseModel):
    size: int = Field(default=400, ge=200, le=2000)
    foreground_color: str = "#000000"
    background_color: str = "#FFFFFF"
    error_correction: str = "M"  # L, M, Q, H
    border_size: int = 4
    corner_style: str = "square"  # square, rounded

class QRRequest(BaseModel):
    qr_type: str
    content: Union[URLData, TextData, WiFiData, ContactData, EmailData]
    customization: QRCustomization
    logo: Optional[str] = None
