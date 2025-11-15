import base64
import json
from fastapi import APIRouter, File, UploadFile, Depends, Form
from sqlalchemy.orm import Session
from openai import OpenAI
from io import BytesIO
from PIL import Image
import pillow_heif
import os
from uuid import uuid4

from ..services.bac_engine import compute_bac
from ..database import get_db
from ..models import Drink, Session as DbSession

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ======================================================
# IMAGE → JPEG CONVERTER
# ======================================================

def convert_to_jpeg(image_bytes: bytes, content_type: str) -> bytes:
    """
    Convert HEIC, HEIF, PNG, JPG, JPEG, WEBP, GIF, TIFF, BMP
    into a clean JPEG byte buffer.
    """
    content_type = (content_type or "").lower()

    # HEIC / HEIF
    if content_type in ["image/heic", "image/heif"]:
        heif_file = pillow_heif.read_heif(image_bytes)
        img = Image.frombytes(
            heif_file.mode,
            heif_file.size,
            heif_file.data,
            "raw",
        )
    else:
        img = Image.open(BytesIO(image_bytes))

    # JPEG needs RGB
    img = img.convert("RGB")

    # Resize to speed up GPT inference
    max_dim = 1024
    if max(img.width, img.height) > max_dim:
        img.thumbnail((max_dim, max_dim))

    # Save as JPEG
    output = BytesIO()
    img.save(output, format="JPEG", quality=90)
    return output.getvalue()


# ======================================================
# GPT COCKTAIL ANALYZER + ADD DRINK + RECALC BAC
# ======================================================

@router.post("/analyze-cocktail")
async def analyze_cocktail(
    file: UploadFile = File(...)
):
    """
    1. Convert image → JPEG
    2. Call GPT to identify cocktail (type, volume, abv)
    3. Use AI-estimated volume + ABV to create a Drink entry
    4. Recalculate BAC
    5. Return BAC + AI metadata to frontend
    """

    # --------------------------
    # VALIDATE SESSION
    # --------------------------

    # --------------------------
    # READ & CONVERT IMAGE
    # --------------------------
    raw_bytes = await file.read()
    jpeg_bytes = convert_to_jpeg(raw_bytes, file.content_type)
    b64 = base64.b64encode(jpeg_bytes).decode("utf-8")

    # --------------------------
    # GPT PROMPT
    # --------------------------
    prompt = (
        "You are identifying a cocktail from an image. Guess:\n"
        "- drink_type (string)\n"
        "- volume_ml (integer)\n"
        "- abv_percent (float)\n"
        "- confidence (0-1)\n"
        "Return ONLY JSON with keys drink_type, volume_ml, abv_percent, confidence."
    )

    # --------------------------
    # GPT API CALL
    # --------------------------
    completion = client.chat.completions.create(
        model="gpt-4.1",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    },
                ],
            }
        ]
    )

    ai = json.loads(completion.choices[0].message.content)

    # Example GPT output:
    # {
    #   "drink_type": "piña colada",
    #   "volume_ml": 350,
    #   "abv_percent": 13,
    #   "confidence": 0.9
    # }

    # --------------------------
    # AUTO-CREATE DRINK ENTRY

    # --------------------------
    # RETURN AI DRINK + BAC
    # --------------------------
    return {
        "ai_drink_type": ai.get("drink_type"),
        "ai_volume_ml": ai.get("volume_ml"),
        "ai_abv_percent": ai.get("abv_percent"),
        "ai_confidence": ai.get("confidence")
    }
