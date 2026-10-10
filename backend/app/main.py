
import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.services.document_reader import extract_text
from app.services.llm import analyze_document


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("brieflyai")

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TEXT_LENGTH = 30_000
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}

# Configure deployed frontend URLs through the CORS_ORIGINS
# environment variable, separated by commas.
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

configured_origins = os.getenv("CORS_ORIGINS", "")

allowed_origins = (
    [origin.strip().rstrip("/") for origin in configured_origins.split(",") if origin.strip()]
    if configured_origins.strip()
    else default_origins
)

app = FastAPI(
    title="BrieflyAI API",
    description="Document analysis API for summaries, action items, dates, and source references.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/")
async def root():
    return {
        "service": "BrieflyAI API",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "BrieflyAI",
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Please provide a filename.",
        )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT files are supported.",
        )

    temp_path = None

    try:
        # Read one byte beyond the limit to detect oversized uploads.
        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="The maximum file size is 10 MB.",
            )

        # Store the upload temporarily so supported document readers
        # can process it. The file is removed in the finally block.
        with tempfile.NamedTemporaryFile(
            suffix=extension,
            delete=False,
        ) as temp:
            temp.write(content)
            temp_path = temp.name

        document_text = extract_text(temp_path)

        if len(document_text) > MAX_TEXT_LENGTH:
            raise HTTPException(
                status_code=413,
                detail=(
                    "This document contains too much text for the current "
                    "version. Please try a shorter document."
                ),
            )

        result = await analyze_document(document_text)

        return {
            "filename": filename,
            "characters_analyzed": len(document_text),
            "analysis": result,
        }

    except HTTPException:
        raise

    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        logger.warning("Document analysis unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected document analysis error")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while analyzing the document.",
        ) from exc

    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)

        await file.close()
