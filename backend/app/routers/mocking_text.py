from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class MockingTextInput(BaseModel):
    text: str
    start_with_lowercase: bool = Field(
        default=False, description="Start with a lowercase letter"
    )


@router.post("/mocking-text")
async def generate_mocking_text(data: MockingTextInput):
    input_text = data.text
    start_with_lowercase = data.start_with_lowercase

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
