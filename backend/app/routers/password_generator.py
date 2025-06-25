import secrets
import string

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class PasswordOptions(BaseModel):
    length: int = Field(..., ge=6, le=128)
    include_uppercase: bool
    include_lowercase: bool
    include_numbers: bool
    include_symbols: bool
    min_numbers: int = Field(..., ge=0)
    min_symbols: int = Field(..., ge=0)


@router.post("/generate-password", summary="Generate a random password")
async def generate_password_endpoint(options: PasswordOptions):
    """
    Generates a password based on the specified criteria.
    """
    if not any(
        [
            options.include_uppercase,
            options.include_lowercase,
            options.include_numbers,
            options.include_symbols,
        ]
    ):
        raise HTTPException(
            status_code=400, detail="At least one character type must be selected."
        )

    if options.min_numbers + options.min_symbols > options.length:
        raise HTTPException(
            status_code=400, detail="Sum of minimums cannot exceed password length."
        )

    if not options.include_numbers and options.min_numbers > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot specify minimum numbers without including numbers.",
        )

    if not options.include_symbols and options.min_symbols > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot specify minimum symbols without including symbols.",
        )

    password_chars = []
    # Add minimum required characters
    if options.include_numbers:
        for _ in range(options.min_numbers):
            password_chars.append(secrets.choice(string.digits))
    if options.include_symbols:
        for _ in range(options.min_symbols):
            password_chars.append(secrets.choice(string.punctuation))

    # Build the character pool for the rest of the password
    full_char_pool = []
    if options.include_uppercase:
        full_char_pool.extend(string.ascii_uppercase)
    if options.include_lowercase:
        full_char_pool.extend(string.ascii_lowercase)
    if options.include_numbers:
        full_char_pool.extend(string.digits)
    if options.include_symbols:
        full_char_pool.extend(string.punctuation)

    # Fill the rest of the password
    remaining_len = options.length - len(password_chars)
    if remaining_len > 0:
        if not full_char_pool:
            raise HTTPException(
                status_code=400,
                detail="A character set must be selected to generate a password.",
            )
        password_chars.extend(
            secrets.choice(full_char_pool) for _ in range(remaining_len)
        )

    # Shuffle to mix the characters
    secrets.SystemRandom().shuffle(password_chars)

    return {"password": "".join(password_chars)}
