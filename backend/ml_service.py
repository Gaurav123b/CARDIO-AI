import joblib
import pandas as pd
import os
from .schemas import PatientData

# Get absolute paths assuming the script runs from project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Load models at startup
try:
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))
    model = joblib.load(os.path.join(MODELS_DIR, "logistic_regression.joblib"))
except Exception as e:
    print(f"Error loading models: {e}")
    scaler, model = None, None

def predict_risk(data: PatientData):
    # Restrict the model to the reduced feature set selected for this version.
    feature_dict = {
        'age': data.age,
        'sex_Male': 1 if str(data.sex).lower() == 'male' else 0,
        'cholesterol_total': data.cholesterol_total,
        'hdl': data.hdl,
        'ldl': data.ldl,
        'triglycerides': data.triglycerides,
    }

    selected_columns = ['age', 'sex_Male', 'cholesterol_total', 'hdl', 'ldl', 'triglycerides']
    df = pd.DataFrame([feature_dict], columns=selected_columns)

    X_scaled = scaler.transform(df)
    prediction = int(model.predict(X_scaled)[0])
    probability = float(model.predict_proba(X_scaled)[0][1])
    
    risk_level = "High Risk" if prediction == 1 else "Low Risk"
    
    return {
        "prediction": prediction,
        "probability": probability,
        "risk_level": risk_level
    }
