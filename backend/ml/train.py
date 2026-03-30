"""
🤖 DiabetesAI - Model Training Pipeline
Complete ML pipeline with proper preprocessing, evaluation, and model persistence.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from imblearn.over_sampling import SMOTE
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report, roc_curve
)
import joblib
import os
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = REPO_ROOT / "Dataset.csv"

# ═══════════════════════════════════════════════════════════
# 1. LOAD DATA
# ═══════════════════════════════════════════════════════════
print("📊 Loading dataset...")
if not DATASET_PATH.exists():
    raise FileNotFoundError(f"Dataset không tìm thấy tại: {DATASET_PATH}")

df = pd.read_csv(DATASET_PATH)
print(f"✅ Dataset shape: {df.shape}")
print(f"✅ Columns: {df.columns.tolist()}")
print(f"✅ Class distribution:\n{df['Outcome'].value_counts()}\n")

# ═══════════════════════════════════════════════════════════
# 2. PREPROCESSING
# ═══════════════════════════════════════════════════════════
print("🔧 Preprocessing...")

# Replace zero values with column mean (for certain features)
ZERO_FEATURES = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
for feature in ZERO_FEATURES:
    df[feature] = df[feature].astype(float)
    df.loc[df[feature] == 0, feature] = df[df[feature] != 0][feature].mean()
print(f"✅ Replaced zero values in {ZERO_FEATURES}")

# Separate features and target
X = df.drop("Outcome", axis=1)
y = df["Outcome"]
print(f"✅ Features: {X.columns.tolist()}")

# ═══════════════════════════════════════════════════════════
# 3. TRAIN/TEST SPLIT
# ═══════════════════════════════════════════════════════════
print("\n📈 Train/Test split (90/10)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.1, random_state=42, stratify=y
)
print(f"✅ Training set: {X_train.shape[0]} samples")
print(f"✅ Test set: {X_test.shape[0]} samples")
print(f"✅ Train class distribution:\n{y_train.value_counts()}\n")

# ═══════════════════════════════════════════════════════════
# 4. SCALING
# ═══════════════════════════════════════════════════════════
print("📐 Standardizing features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print(f"✅ Scaler fitted and applied")

# ═══════════════════════════════════════════════════════════
# 5. SMOTE (Imbalanced Data Handling)
# ═══════════════════════════════════════════════════════════
print("\n⚖️  Applying SMOTE (Synthetic Minority Oversampling)...")
smote = SMOTE(random_state=42, k_neighbors=5)
X_train_smote, y_train_smote = smote.fit_resample(X_train_scaled, y_train)
print(f"✅ Original training set: {y_train.value_counts().tolist()}")
print(f"✅ After SMOTE: {np.bincount(y_train_smote)}")

# ═══════════════════════════════════════════════════════════
# 6. MODEL TRAINING
# ═══════════════════════════════════════════════════════════
print("\n🌲 Training Random Forest model...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_smote, y_train_smote)
print(f"✅ Model trained with {model.n_estimators} trees")

# ═══════════════════════════════════════════════════════════
# 7. EVALUATION ON TEST SET
# ═══════════════════════════════════════════════════════════
print("\n📋 Evaluating on test set...")
y_pred = model.predict(X_test_scaled)
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_pred_proba)

print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
print(f"  Precision: {precision:.4f}")
print(f"  Recall:    {recall:.4f}")
print(f"  F1-Score:  {f1:.4f}")
print(f"  ROC-AUC:   {roc_auc:.4f}")

# ═══════════════════════════════════════════════════════════
# 8. CROSS-VALIDATION (5-Fold)
# ═══════════════════════════════════════════════════════════
print("\n🔄 5-Fold Cross-Validation...")
kf = KFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(model, X_train_smote, y_train_smote, cv=kf, scoring='roc_auc')
print(f"  CV Fold Scores: {[f'{s:.4f}' for s in cv_scores]}")
print(f"  Mean CV Score:  {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ═══════════════════════════════════════════════════════════
# 9. CONFUSION MATRIX & CLASSIFICATION REPORT
# ═══════════════════════════════════════════════════════════
print("\n🎯 Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"  TN: {cm[0,0]}, FP: {cm[0,1]}")
print(f"  FN: {cm[1,0]}, TP: {cm[1,1]}")

print("\n📊 Classification Report:")
print(classification_report(y_test, y_pred, target_names=["No Diabetes", "Diabetes"]))

# ═══════════════════════════════════════════════════════════
# 10. FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════
print("\n⭐ Feature Importance:")
feature_importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=False)

for idx, row in feature_importance.iterrows():
    print(f"  {row['Feature']:20s}: {row['Importance']:.4f}")

# ═══════════════════════════════════════════════════════════
# 11. SAVE MODEL & SCALER
# ═══════════════════════════════════════════════════════════
print("\n💾 Saving model and scaler...")
output_dir = Path(__file__).parent
joblib.dump(model, output_dir / "model.pkl")
joblib.dump(scaler, output_dir / "scaler.pkl")
print(f"✅ Model saved to: {output_dir / 'model.pkl'}")
print(f"✅ Scaler saved to: {output_dir / 'scaler.pkl'}")

# ═══════════════════════════════════════════════════════════
# 12. SUMMARY
# ═══════════════════════════════════════════════════════════
print("\n" + "="*50)
print("🎉 TRAINING COMPLETE")
print("="*50)
print(f"Test Accuracy:  {accuracy*100:.2f}%")
print(f"ROC-AUC Score:  {roc_auc:.4f}")
print(f"Model Type:     Random Forest ({model.n_estimators} trees)")
print(f"Dataset Size:   {len(df)} samples (after preprocessing)")
print(f"Output:         {output_dir}")
print("="*50)

