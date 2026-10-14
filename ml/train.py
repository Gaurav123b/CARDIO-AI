import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
import joblib
import os
import sys

INPUT_PATH = "data/processed/cleaned_data.csv"
MODELS_DIR = "models/"

TARGET = "has_heart_disease"
SELECTED_FEATURES = [
    'age',
    'sex_Male',
    'cholesterol_total',
    'hdl',
    'ldl',
    'triglycerides',
]

def main():
    if not os.path.exists(INPUT_PATH):
        print(f"Error: {INPUT_PATH} not found.")
        sys.exit(1)

    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"Loading cleaned dataset from {INPUT_PATH}...")
    df = pd.read_csv(INPUT_PATH)

    required_columns = SELECTED_FEATURES + [TARGET]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns for reduced feature model: {missing}")

    X = df[SELECTED_FEATURES]
    y = df[TARGET]

    print(f"Features (X): {len(SELECTED_FEATURES)} features")
    print(f"Target (Y): {TARGET}")
    
    # 3. Split the data into 80% training, 20% testing
    # 4. Use stratify=y
    # 5. Use random_state=42
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTraining set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # 6. Apply appropriate feature preprocessing/scaling where required
    print("\nFitting StandardScaler on training data...")
    scaler = StandardScaler()
    # We fit only on the training set to prevent data leakage from the test set
    X_train_scaled = scaler.fit_transform(X_train)
    
    # 11. Save the preprocessing/scaler object separately
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # 7. Train models separately
    
    # --- Logistic Regression ---
    print("\nTraining Logistic Regression...")
    # Logistic Regression requires scaled features for optimal convergence and regularization
    lr_model = LogisticRegression(random_state=42, class_weight='balanced', max_iter=1000)
    lr_model.fit(X_train_scaled, y_train)
    lr_path = os.path.join(MODELS_DIR, "logistic_regression.joblib")
    joblib.dump(lr_model, lr_path)
    print(f"Saved Logistic Regression to {lr_path}")
    
    # --- Random Forest ---
    print("\nTraining Random Forest...")
    # Tree-based models do not require feature scaling, so we train on the raw X_train
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf_model.fit(X_train, y_train)
    rf_path = os.path.join(MODELS_DIR, "random_forest.joblib")
    joblib.dump(rf_model, rf_path)
    print(f"Saved Random Forest to {rf_path}")
    
    # --- XGBoost ---
    if XGB_AVAILABLE:
        print("\nTraining XGBoost...")
        # XGBoost also doesn't require scaling, train on raw X_train
        xgb_model = XGBClassifier(eval_metric='logloss', random_state=42)
        xgb_model.fit(X_train, y_train)
        xgb_path = os.path.join(MODELS_DIR, "xgboost.joblib")
        joblib.dump(xgb_model, xgb_path)
        print(f"Saved XGBoost to {xgb_path}")
    else:
        print("\nXGBoost not available. Skipping XGBoost training.")
    
    # 12. Print training completion information
    print("\n✅ Training pipeline completed successfully.")
    
    # Verify that all model files were successfully created
    print("\n--- Verifying Saved Models ---")
    expected_files = ["scaler.joblib", "logistic_regression.joblib", "random_forest.joblib"]
    if XGB_AVAILABLE:
        expected_files.append("xgboost.joblib")
        
    for f in expected_files:
        fpath = os.path.join(MODELS_DIR, f)
        if os.path.exists(fpath):
            print(f"[OK] {fpath}")
        else:
            print(f"[MISSING] {fpath}")

if __name__ == "__main__":
    main()
