"""
LSTM Model for Stock Price Prediction
"""

import numpy as np
import pandas as pd
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple, Optional, Dict
import pickle
import os


class LSTMPredictor:
    """LSTM model for predicting stock price movements"""
    
    def __init__(self, lookback: int = 60, features: int = 17):
        """
        Initialize LSTM model
        
        Args:
            lookback: Number of time steps to look back
            features: Number of features per time step
        """
        self.lookback = lookback
        self.features = features
        self.model = None
        self.scaler = MinMaxScaler()
        self.is_trained = False
    
    def build_model(self, units: int = 50, dropout: float = 0.2):
        """Build the LSTM model architecture"""
        self.model = Sequential([
            LSTM(units=units, return_sequences=True, input_shape=(self.lookback, self.features)),
            Dropout(dropout),
            LSTM(units=units, return_sequences=False),
            Dropout(dropout),
            Dense(units=25, activation='relu'),
            Dense(units=3, activation='softmax')  # 3 classes: Up, Down, Neutral
        ])
        
        self.model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return self.model
    
    def prepare_data(self, data: np.ndarray, target_col_idx: int = 3) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare data for training
        
        Args:
            data: Historical data array (timesteps, features)
            target_col_idx: Index of the target column (Close price)
        
        Returns:
            X, y arrays for training
        """
        if data.shape[0] < self.lookback + 1:
            raise ValueError(f"Not enough data. Need at least {self.lookback + 1} timesteps")
        
        # Normalize the data
        scaled_data = self.scaler.fit_transform(data)
        
        X, y = [], []
        
        for i in range(self.lookback, len(scaled_data)):
            X.append(scaled_data[i - self.lookback:i])
            
            # Create target: Up (1,0,0), Down (0,1,0), Neutral (0,0,1)
            current_price = data[i, target_col_idx]
            next_price = data[i - 1, target_col_idx] if i > 0 else current_price
            
            price_change = (current_price - next_price) / next_price if next_price != 0 else 0
            
            if price_change > 0.01:  # Up > 1%
                y.append([1, 0, 0])
            elif price_change < -0.01:  # Down < -1%
                y.append([0, 1, 0])
            else:  # Neutral
                y.append([0, 0, 1])
        
        return np.array(X), np.array(y)
    
    def train(self, data: np.ndarray, epochs: int = 50, batch_size: int = 32, validation_split: float = 0.2):
        """
        Train the LSTM model
        
        Args:
            data: Training data
            epochs: Number of training epochs
            batch_size: Batch size
            validation_split: Validation split ratio
        """
        if self.model is None:
            self.build_model()
        
        X, y = self.prepare_data(data)
        
        if len(X) == 0:
            print("Warning: No training data prepared")
            return
        
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=0
        )
        
        self.is_trained = True
        return history
    
    def predict(self, data: np.ndarray) -> Dict[str, float]:
        """
        Predict stock movement
        
        Args:
            data: Recent data array (lookback, features)
        
        Returns:
            Dictionary with signal and confidence
        """
        if not self.is_trained or self.model is None:
            # Return default prediction if model not trained
            return {"signal": "Neutral", "confidence": 0.5}
        
        if data.shape[0] < self.lookback:
            return {"signal": "Neutral", "confidence": 0.5}
        
        # Normalize data
        scaled_data = self.scaler.transform(data)
        
        # Reshape for prediction
        X = scaled_data[-self.lookback:].reshape(1, self.lookback, self.features)
        
        # Predict
        prediction = self.model.predict(X, verbose=0)[0]
        
        # Get class with highest probability
        classes = ['Up', 'Down', 'Neutral']
        class_idx = np.argmax(prediction)
        confidence = float(prediction[class_idx])
        
        return {
            "signal": classes[class_idx],
            "confidence": confidence
        }
    
    def save_model(self, filepath: str):
        """Save the model and scaler"""
        if self.model is not None:
            self.model.save(filepath)
            scaler_path = filepath.replace('.h5', '_scaler.pkl')
            with open(scaler_path, 'wb') as f:
                pickle.dump(self.scaler, f)
    
    def load_model(self, filepath: str):
        """Load the model and scaler"""
        if os.path.exists(filepath):
            from tensorflow.keras.models import load_model
            self.model = load_model(filepath)
            scaler_path = filepath.replace('.h5', '_scaler.pkl')
            if os.path.exists(scaler_path):
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
            self.is_trained = True


if __name__ == "__main__":
    # Test the LSTM model
    predictor = LSTMPredictor()
    predictor.build_model()
    print("LSTM model built successfully!")

