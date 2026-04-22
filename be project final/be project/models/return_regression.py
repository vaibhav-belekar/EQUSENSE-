"""
Regression model for predicting forward stock returns.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBRegressor = None
    XGBOOST_AVAILABLE = False


@dataclass
class RegressionMetrics:
    mae: float = 0.0
    r2: float = 0.0
    samples: int = 0


class ReturnRegressor:
    """Predicts future percentage return from engineered technical features."""

    def __init__(self, forecast_horizon: int = 10):
        self.forecast_horizon = forecast_horizon
        self.feature_columns: list[str] = []
        self.primary_model_name = "xgboost" if XGBOOST_AVAILABLE else "hist_gradient_boosting"
        self.pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("model", self._build_primary_model()),
            ]
        )
        self.fallback_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=4,
            random_state=42
        )
        self.is_trained = False
        self.metrics = RegressionMetrics()
        self.target_clip_min = -12.0
        self.target_clip_max = 12.0

    def _build_primary_model(self):
        if XGBOOST_AVAILABLE:
            return XGBRegressor(
                n_estimators=350,
                learning_rate=0.04,
                max_depth=4,
                min_child_weight=3,
                subsample=0.85,
                colsample_bytree=0.85,
                reg_alpha=0.05,
                reg_lambda=1.2,
                objective="reg:squarederror",
                random_state=42,
                n_jobs=4,
            )

        return HistGradientBoostingRegressor(
            learning_rate=0.04,
            max_depth=6,
            max_iter=350,
            min_samples_leaf=8,
            l2_regularization=0.05,
            random_state=42,
        )

    def train(self, training_df: pd.DataFrame, target_col: str = "target_return_pct") -> Dict[str, float]:
        if training_df.empty or target_col not in training_df.columns:
            raise ValueError("Training frame is empty or target column missing")

        frame = training_df.replace([np.inf, -np.inf], np.nan).dropna()
        if len(frame) < 80:
            raise ValueError("Insufficient samples for regression training")

        self.feature_columns = [col for col in frame.columns if col != target_col]
        train_size = max(int(len(frame) * 0.8), len(frame) - 30)
        train_df = frame.iloc[:train_size]
        test_df = frame.iloc[train_size:]

        X_train = train_df[self.feature_columns]
        y_train = train_df[target_col]
        X_test = test_df[self.feature_columns]
        y_test = test_df[target_col]

        lower_quantile = float(y_train.quantile(0.05))
        upper_quantile = float(y_train.quantile(0.95))
        self.target_clip_min = max(-18.0, lower_quantile)
        self.target_clip_max = min(18.0, upper_quantile)
        if self.target_clip_min >= self.target_clip_max:
            self.target_clip_min, self.target_clip_max = -12.0, 12.0

        y_train_clipped = y_train.clip(self.target_clip_min, self.target_clip_max)
        y_test_clipped = y_test.clip(self.target_clip_min, self.target_clip_max)

        self.pipeline.fit(X_train, y_train_clipped)

        # Keep a second model for stability on noisy market series.
        self.fallback_model.fit(X_train.fillna(X_train.median()), y_train_clipped)

        if len(X_test) > 0:
            preds = self._blend_predictions(X_test)
            self.metrics = RegressionMetrics(
                mae=float(mean_absolute_error(y_test_clipped, preds)),
                r2=float(r2_score(y_test_clipped, preds)) if len(y_test_clipped) > 1 else 0.0,
                samples=int(len(frame))
            )
        else:
            self.metrics = RegressionMetrics(samples=int(len(frame)))

        self.is_trained = True
        return {
            "mae": self.metrics.mae,
            "r2": self.metrics.r2,
            "samples": self.metrics.samples,
            "primary_model": self.primary_model_name,
        }

    def predict(self, feature_row: pd.DataFrame) -> float:
        if not self.is_trained:
            raise ValueError("Model is not trained")
        if feature_row.empty:
            raise ValueError("Feature row is empty")

        aligned = feature_row.copy()
        if self.feature_columns:
            aligned = aligned.reindex(columns=self.feature_columns)

        prediction = self._blend_predictions(aligned)[0]
        return float(prediction)

    def _blend_predictions(self, features: pd.DataFrame) -> np.ndarray:
        primary_pred = self.pipeline.predict(features)
        rf_features = features.fillna(features.median())
        rf_pred = self.fallback_model.predict(rf_features)
        blended = 0.7 * primary_pred + 0.3 * rf_pred
        return np.clip(blended, self.target_clip_min, self.target_clip_max)
