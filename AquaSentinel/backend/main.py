from pathlib import Path
import sqlite3

from base64
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO


# ---------------------------------------------------------
# AquaSentinel API
# ---------------------------------------------------------

app = FastAPI(
    title="AquaSentinel API",
    version="1.0.0",
    description="AI-Powered Underwater Intelligence API"
)

DB_PATH = Path(__file__).parent / "aquasentinel.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            detection TEXT,
            confidence REAL,
            risk TEXT,
            location TEXT,
            recommendation TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


init_db()

def save_detection(
    filename,
    detection,
    confidence,
    risk,
    location,
    recommendation
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO detections
        (filename, detection, confidence, risk, location, recommendation)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        filename,
        detection,
        confidence,
        risk,
        location,
        recommendation
    ))

    conn.commit()
    conn.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def image_to_base64(image):
    success, encoded = cv2.imencode(".jpg", image)

    if not success:
        return None

    return base64.b64encode(
        encoded.tobytes()
    ).decode("utf-8")

# ---------------------------------------------------------
# YOLO MODEL
# ---------------------------------------------------------

MODEL_PATH = Path(__file__).parent / "models" / "best_detector.pt"

if not MODEL_PATH.exists():
    raise RuntimeError(
        f"YOLO model not found at: {MODEL_PATH}"
    )

model = YOLO(str(MODEL_PATH))


# ---------------------------------------------------------
# DETECTION / RISK CONFIGURATION
# ---------------------------------------------------------

# Predictions below this confidence are NOT treated
# as operational/objective detections.
LOW_CONFIDENCE_THRESHOLD = 0.30

# Object-specific risk weights.
OBJECT_RISK = {
    "mine_cylinder": "HIGH",
    "ghost_net": "HIGH",
    "submarine_pipeline": "MEDIUM",
    "shipwreck": "MEDIUM",
    "crab_pot": "MEDIUM",
}


# ---------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------

def calculate_risk(object_type: str, confidence: float) -> str:
    """
    Risk considers both model confidence and object type.

    Very low confidence:
        UNCONFIRMED

    Higher confidence:
        Object-specific risk is considered.
    """

    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return "UNCONFIRMED"

    object_risk = OBJECT_RISK.get(
        object_type,
        "MEDIUM"
    )

    # High-risk object with sufficient confidence
    if object_risk == "HIGH":
        if confidence >= 0.60:
            return "HIGH"
        return "MEDIUM"

    # Medium-risk object
    if object_risk == "MEDIUM":
        if confidence >= 0.75:
            return "HIGH"
        return "MEDIUM"

    return "LOW"


def build_recommendation(
    object_type: str,
    confidence: float,
    risk: str
) -> str:

    percentage = round(confidence * 100, 2)

    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return (
            f"Low-confidence detection ({percentage}%). "
            "Manual verification is recommended before "
            "operational action."
        )

    if risk == "HIGH":
        return (
            f"High-priority {object_type.replace('_', ' ')} "
            "detection. Prioritize this location for "
            "further inspection and manual verification."
        )

    if risk == "MEDIUM":
        return (
            f"Potential {object_type.replace('_', ' ')} detected. "
            "Review the detection and perform manual verification "
            "before operational action."
        )

    return (
        f"Potential {object_type.replace('_', ' ')} detected. "
        "Manual review is recommended."
    )


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "project": "AquaSentinel",
        "status": "online",
        "message": "Underwater Intelligence API is running"
    }


# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "AquaSentinel Backend",
        "ai_model": "YOLO",
        "model_loaded": True
    }


# ---------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------

@app.get("/api/dashboard")
def dashboard():
    return {
        "total_surveys": 12,
        "objects_detected": 28,
        "high_risk_alerts": 4,
        "areas_scanned": 320
    }


# ---------------------------------------------------------
# DETECTION HISTORY
# ---------------------------------------------------------

@app.get("/api/detections")
def detections():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            filename,
            detection AS type,
            confidence,
            risk,
            location,
            recommendation,
            created_at
        FROM detections
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


# ---------------------------------------------------------
# AI SONAR ANALYSIS
# ---------------------------------------------------------

@app.post("/api/analyze")
async def analyze_sonar(file: UploadFile = File(...)):

    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    # ---------------------------------------------
    # File type validation
    # ---------------------------------------------

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid file. Please upload a sonar "
                "image in JPG, PNG or WEBP format."
            )
        )

    # ---------------------------------------------
    # Read uploaded image
    # ---------------------------------------------

    image_data = await file.read()

    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    # ---------------------------------------------
    # File size validation
    # ---------------------------------------------

    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB."
        )

    # ---------------------------------------------
    # Decode image
    # ---------------------------------------------

    image_array = np.frombuffer(
        image_data,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    # ---------------------------------------------
    # YOLO INFERENCE
    # ---------------------------------------------

    try:
        results = model.predict(
            source=image,
            conf=0.10,
            verbose=False
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI inference failed: {str(error)}"
        )

    # ---------------------------------------------
    # Extract detections
    # ---------------------------------------------

    detections_found = []
    annotated_image = image.copy()

    for result in results:

        if result.boxes is None:
            continue

        for box in result.boxes:

            confidence = float(
                box.conf[0].item()
            )

            class_id = int(
                box.cls[0].item()
            )

            object_type = model.names.get(
                class_id,
                "unknown_anomaly"
            )

            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0].tolist()
            )

            if confidence >= LOW_CONFIDENCE_THRESHOLD:

    label = (
        f"{object_type.replace('_', ' ').title()} "
        f"{confidence * 100:.1f}%"
    )

    cv2.rectangle(
        annotated_image,
        (x1, y1),
        (x2, y2),
        (0, 255, 255),
        3
    )

    cv2.putText(
        annotated_image,
        label,
        (x1, max(y1 - 10, 25)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 255),
        2,
        cv2.LINE_AA
    )

            detections_found.append(
                {
                    "object_type": object_type,
                    "confidence": confidence,
                    "confidence_percent": round(
                        confidence * 100,
                        2
                    ),
                    "risk": calculate_risk(
                        object_type,
                        confidence
                    ),
                    "box": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2
                    }
                }
            )

    # -------------------------------------------------
    # No detection
    # -------------------------------------------------

    if not detections_found:

        return {
            "success": True,
            "filename": file.filename,
            "detection": "No confident anomaly detected",
            "confidence": 0,
            "risk": "UNCONFIRMED",
            "location": "Location metadata not provided",
            "recommendation": (
                "No object exceeded the analysis threshold. "
                "Manual review is recommended if the survey "
                "contains a suspected anomaly."
            ),
            "detections": [],
            "analysis_status": "completed"
        }

    # -------------------------------------------------
    # Select highest-confidence prediction
    # -------------------------------------------------

    detections_found.sort(
        key=lambda item: item["confidence"],
        reverse=True
    )

    best_detection = detections_found[0]

    object_type = best_detection["object_type"]
    confidence = best_detection["confidence"]
    confidence_percent = best_detection["confidence_percent"]

    # -------------------------------------------------
    # LOW CONFIDENCE HANDLING
    # -------------------------------------------------

    if confidence < LOW_CONFIDENCE_THRESHOLD:

        return {
            "success": True,
            "filename": file.filename,
            "detection": "Uncertain Detection",
            "confidence": confidence_percent,
            "risk": "UNCONFIRMED",
            "location": "Location metadata not provided",
            "recommendation": build_recommendation(
                object_type,
                confidence,
                "UNCONFIRMED"
            ),
            "detected_object": object_type,
            "detections": detections_found,
            "analysis_status": "completed"
        }

    # -------------------------------------------------
    # NORMAL CONFIDENT RESULT
    # -------------------------------------------------

    risk = calculate_risk(
        object_type,
        confidence
    )

    recommendation = build_recommendation(
        object_type,
        confidence,
        risk
    )

    save_detection(
    file.filename,
    object_type.replace("_", " ").title(),
    confidence_percent,
    risk,
    "Location metadata not provided",
    recommendation
)

    return {
        "success": True,
        "filename": file.filename,
        "detection": object_type.replace("_", " ").title(),
        "confidence": confidence_percent,
        "risk": risk,
        "location": "Location metadata not provided",
        "recommendation": recommendation,
        "detected_object": object_type,
        "annotated_image": image_to_base64(annotated_image),
        "detections": detections_found,
        "analysis_status": "completed"
    }