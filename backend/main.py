import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PatientData, PredictionResponse
from .ml_service import predict_risk, model

app = FastAPI(title="Cardio AI API", description="Heart Disease Risk Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants for real metrics derived from evaluation phase
METRICS = {
    "accuracy": 0.8767,
    "precision": 0.7661,
    "recall": 0.8532,
    "f1_score": 0.8073,
    "roc_auc": 0.9498
}

@app.get("/")
def read_root():
    return {"message": "Cardio AI API is running"}

@app.post("/predict", response_model=PredictionResponse)
def predict(data: PatientData):
    if model is None:
        raise HTTPException(status_code=500, detail="ML Model not loaded.")
    
    try:
        result = predict_risk(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@app.get("/api/metrics")
def get_metrics():
    return METRICS

@app.get("/api/feature-importance")
def get_feature_importance():
    if model is None or not hasattr(model, "coef_"):
        raise HTTPException(status_code=500, detail="Feature importance not available.")
    
    # Feature names in the exact order they are processed
    features = [
        'age', 'resting_bp_systolic', 'resting_bp_diastolic', 'cholesterol_total', 'hdl', 'ldl', 
        'triglycerides', 'fasting_blood_sugar', 'hba1c', 'bmi', 'resting_heart_rate', 
        'max_heart_rate_achieved', 'exercise_induced_angina', 'st_depression', 'family_history', 
        'alcohol_units_per_week', 'exercise_minutes_per_week', 'sleep_hours', 'stress_score', 
        'wearable_owner', 'daily_steps', 'diet_quality_score', 'sex_Male', 
        'chest_pain_type_Atypical Angina', 'chest_pain_type_Non-Anginal Pain', 
        'chest_pain_type_Typical Angina', 'smoker_status_Former', 'smoker_status_Never'
    ]
    
    # Get absolute coefficients
    importance = abs(model.coef_[0])
    
    # Sort and get top 10
    feature_importance = [{"feature": f, "importance": float(imp)} for f, imp in zip(features, importance)]
    feature_importance.sort(key=lambda x: x["importance"], reverse=True)
    
    return feature_importance[:10]

@app.get("/api/correlation")
def get_correlation():
    try:
        # We compute this dynamically to ensure authenticity
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        csv_path = os.path.join(base_dir, "data", "processed", "cleaned_data.csv")
        
        if not os.path.exists(csv_path):
            raise Exception("Cleaned data not found")
            
        df = pd.read_csv(csv_path)
        
        # Calculate correlations with the target
        target = "has_heart_disease"
        correlations = df.corr()[target].drop(target)
        
        # Get top 10 features
        top_features = correlations.abs().sort_values(ascending=False).head(10).index.tolist()
        cols_to_plot = top_features + [target]
        
        corr_matrix = df[cols_to_plot].corr()
        
        # Format for Recharts
        result = []
        for row in corr_matrix.index:
            row_data = {"name": row}
            for col in corr_matrix.columns:
                row_data[col] = float(corr_matrix.loc[row, col])
            result.append(row_data)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
