from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse, Response
from app.models.qr_code import URLData, TextData, WiFiData, ContactData, QRCustomization, EmailData
import qrcode
import qrcode.image.svg
from PIL import Image
import io
import vobject
import json
from typing import Optional

router = APIRouter()

def generate_wifi_string(wifi_data: WiFiData):
    return f"WIFI:T:{wifi_data.security};S:{wifi_data.ssid};P:{wifi_data.password};H:{'true' if wifi_data.hidden else 'false'};;"

def generate_email_string(email_data: EmailData):
    return f"mailto:{email_data.email}?subject={email_data.subject}&body={email_data.body}"

def generate_vcard_string(contact_data: ContactData):
    vcard = vobject.vCard()
    vcard.add('n')
    vcard.n.value = vobject.vcard.Name(family=contact_data.last_name, given=contact_data.first_name)
    vcard.add('fn')
    vcard.fn.value = f"{contact_data.first_name} {contact_data.last_name}"

    if contact_data.phone:
        tel = vcard.add('tel')
        tel.value = contact_data.phone
        tel.type_param = 'CELL'

    if contact_data.email:
        email = vcard.add('email')
        email.value = contact_data.email
        email.type_param = 'INTERNET'

    if contact_data.company:
        org = vcard.add('org')
        org.value = [contact_data.company]

    if contact_data.job_title:
        vcard.add('title')
        vcard.title.value = contact_data.job_title

    if contact_data.website:
        url = vcard.add('url')
        url.value = contact_data.website

    return vcard.serialize()

def add_logo_overlay(qr_image: Image.Image, logo_file: UploadFile):
    """
    Overlays a logo on the center of the QR code image.
    """
    logo = Image.open(logo_file.file).convert("RGBA")
    qr_width, qr_height = qr_image.size

    logo_max_size = qr_height // 4
    logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)

    logo_pos = ((qr_width - logo.size[0]) // 2, (qr_height - logo.size[1]) // 2)

    qr_image.paste(logo, logo_pos, mask=logo)
    return qr_image


@router.post("/generate")
async def generate_qr_code(
    request_data: str = Form(...),
    logo_file: Optional[UploadFile] = File(None),
    file_format: str = Form("png")
):
    try:
        request_dict = json.loads(request_data)

        content_data = request_dict.get('content', {})
        qr_type = request_dict.get('qr_type')

        content_model_map = {
            'url': URLData,
            'text': TextData,
            'wifi': WiFiData,
            'contact': ContactData,
            'email': EmailData
        }

        if qr_type not in content_model_map:
            raise HTTPException(status_code=400, detail=f"Invalid qr_type: {qr_type}")

        content = content_model_map[qr_type](**content_data)
        customization = QRCustomization(**request_dict.get('customization', {}))

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data in request_data: {e}")

    data = ""
    if qr_type == 'url':
        data = content.url
    elif qr_type == 'text':
        data = content.text
    elif qr_type == 'wifi':
        data = generate_wifi_string(content)
    elif qr_type == 'contact':
        data = generate_vcard_string(content)
    elif qr_type == 'email':
        data = generate_email_string(content)

    error_correction_map = {
        'L': qrcode.constants.ERROR_CORRECT_L,
        'M': qrcode.constants.ERROR_CORRECT_M,
        'Q': qrcode.constants.ERROR_CORRECT_Q,
        'H': qrcode.constants.ERROR_CORRECT_H,
    }
    qr = qrcode.QRCode(
        version=1,
        error_correction=error_correction_map.get(customization.error_correction, qrcode.constants.ERROR_CORRECT_M),
        box_size=10,
        border=customization.border_size,
    )
    qr.add_data(data)
    qr.make(fit=True)

    if file_format == 'svg':
        img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage, fill_color=customization.foreground_color, back_color=customization.background_color)
        img_bytes = io.BytesIO()
        img.save(img_bytes)
        img_bytes.seek(0)
        return Response(content=img_bytes.getvalue(), media_type="image/svg+xml")

    img = qr.make_image(fill_color=customization.foreground_color, back_color=customization.background_color).convert('RGB')

    if logo_file:
        img = add_logo_overlay(img, logo_file)

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)

    return StreamingResponse(img_byte_arr, media_type="image/png")
