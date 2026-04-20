"""
Regression model for predicting forward stock returns.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline


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
        self.pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("model", GradientBoostingRegressor(
                    n_estimators=250,
                    learning_rate=0.04,
                    max_depth=3,
                    random_state=42,
                    loss="huber"
                )),
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

        self.pipeline.fit(X_train, y_train)

        # Keep a second model for stability on noisy market series.
        self.fallback_model.fit(X_train.fillna(X_train.median()), y_train)

        if len(X_test) > 0:
            preds = self._blend_predictions(X_test)
            self.metrics = RegressionMetrics(
                mae=float(mean_absolute_error(y_test, preds)),
                r2=float(r2_score(y_test, preds)) if len(y_test) > 1 else 0.0,
                samples=int(len(frame))
            )
        else:
            self.metrics = RegressionMetrics(samples=int(len(frame)))

        self.is_trained = True
        return {
            "mae": self.metrics.mae,
            "r2": self.metrics.r2,
            "samples": self.metrics.samples
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
        gb_pred = self.pipeline.predict(features)
        rf_features = features.fillna(features.median())
        rf_pred = self.fallback_model.predict(rf_features)
        return 0.65 * gb_pred + 0.35 * rf_pred
