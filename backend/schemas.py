from pydantic import BaseModel
from typing import Literal

class PatientData(BaseModel):
    age: float
    sex: str  # 'Male', 'Female'
    cholesterol_total: float
    hdl: float
    ldl: float
    triglycerides: float

class PredictionResponse(BaseModel):
    prediction: int  # 0 or 1
    probability: float
    risk_level: str
