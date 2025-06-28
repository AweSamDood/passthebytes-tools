from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator

router = APIRouter()


class MockingTextInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="Text to convert to mocking case")
    start_with_lowercase: bool = Field(
        default=False, description="Start with a lowercase letter"
    )

    @validator('text')
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty or contain only whitespace')
        return v.strip()


@router.post("/mocking-text")
async def generate_mocking_text(data: MockingTextInput):
    input_text = data.text
    start_with_lowercase = data.start_with_lowercase

    # Additional validation for safety
    if len(input_text) > 1000:
        raise HTTPException(status_code=422, detail="Text must be 1000 characters or less")
    
    if not input_text.strip():
        raise HTTPException(status_code=422, detail="Text cannot be empty")

    result = []
    letter_index = 0
    for char in input_text:
        if char.isalpha():
            if (letter_index % 2 == 0 and not start_with_lowercase) or (
                letter_index % 2 != 0 and start_with_lowercase
            ):
                result.append(char.upper())
            else:
                result.append(char.lower())
            letter_index += 1
        else:
            result.append(char)

    return {"result": "".join(result)}
