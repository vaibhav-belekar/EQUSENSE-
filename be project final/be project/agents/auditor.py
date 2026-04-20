"""
Auditor Agent
Evaluates performance and suggests improvements
Generates reports and tracks metrics
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json


class AuditorAgent:
    """Auditor Agent that evaluates performance and generates reports"""
    
    def __init__(self):
        """Initialize Auditor Agent"""
        self.performance_history = []
        self.daily_returns = []
        self.trade_records = []
        self.metrics = {
            "total_trades": 0,
            "successful_trades": 0,
            "total_profit": 0.0,
            "total_loss": 0.0,
            "win_rate": 0.0,
            "average_profit": 0.0,
            "average_loss": 0.0,
            "profit_factor": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": 0.0
        }
    
    def record(self, trade_data: Dict[str, any], portfolio_value: float, 
               initial_capital: float, timestamp: datetime = None):
        """
        Record a trade and update metrics
        
        Args:
            trade_data: Trade information
            portfolio_value: Current portfolio value
            initial_capital: Initial capital
            timestamp: Timestamp of the record
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        # Calculate return
        total_return = (portfolio_value - initial_capital) / initial_capital if initial_capital > 0 else 0.0
        
        record = {
            "timestamp": timestamp,
            "trade_data": trade_data,
            "portfolio_value": portfolio_value,
            "initial_capital": initial_capital,
            "total_return": total_return,
            "profit_loss": portfolio_value - initial_capital
        }
        
        self.trade_records.append(record)
        self.performance_history.append({
            "timestamp": timestamp,
            "portfolio_value": portfolio_value,
            "return": total_return
        })
        
        # Update daily returns
        if len(self.performance_history) > 1:
            prev_value = self.performance_history[-2]["portfolio_value"]
            daily_return = (portfolio_value - prev_value) / prev_value if prev_value > 0 else 0.0
            self.daily_returns.append(daily_return)
    
    def evaluate_performance(self, portfolio_value: float, initial_capital: float,
                            trade_history: List[Dict], current_prices: Dict[str, float],
                            portfolio: Dict[str, int]) -> Dict[str, any]:
        """
        Evaluate overall performance
        
        Args:
            portfolio_value: Current portfolio value
            initial_capital: Initial capital
            trade_history: List of all trades
            current_prices: Current stock prices
            portfolio: Current portfolio holdings
        
        Returns:
            Performance metrics dictionary
        """
        # Calculate basic metrics
        total_profit_loss = portfolio_value - initial_capital
        total_return = total_profit_loss / initial_capital if initial_capital > 0 else 0.0
        
        # Analyze trades
        buy_trades = [t for t in trade_history if t.get("action") == "Buy"]
        sell_trades = [t for t in trade_history if t.get("action") == "Sell"]
        
        self.metrics["total_trades"] = len(trade_history)
        
        # Calculate win rate (simplified)
        if len(sell_trades) > 0:
            # Assume profitable if portfolio value increased
            profitable_sells = sum(1 for t in sell_trades if t.get("revenue", 0) > 0)
            self.metrics["successful_trades"] = profitable_sells
            self.metrics["win_rate"] = profitable_sells / len(sell_trades) if len(sell_trades) > 0 else 0.0
        
        # Calculate profit/loss
        profits = [t.get("revenue", 0) - t.get("cost", 0) for t in sell_trades if t.get("revenue", 0) > 0]
        losses = [abs(t.get("revenue", 0) - t.get("cost", 0)) for t in sell_trades if t.get("revenue", 0) <= 0]
        
        self.metrics["total_profit"] = sum(profits) if profits else 0.0
        self.metrics["total_loss"] = sum(losses) if losses else 0.0
        self.metrics["average_profit"] = np.mean(profits) if profits else 0.0
        self.metrics["average_loss"] = np.mean(losses) if losses else 0.0
        
        # Profit factor
        if self.metrics["total_loss"] > 0:
            self.metrics["profit_factor"] = self.metrics["total_profit"] / self.metrics["total_loss"]
        else:
            self.metrics["profit_factor"] = float('inf') if self.metrics["total_profit"] > 0 else 0.0
        
        # Calculate max drawdown
        if self.performance_history:
            values = [h["portfolio_value"] for h in self.performance_history]
            peak = values[0]
            max_dd = 0.0
            
            for value in values:
                if value > peak:
                    peak = value
                drawdown = (peak - value) / peak if peak > 0 else 0.0
                if drawdown > max_dd:
                    max_dd = drawdown
            
            self.metrics["max_drawdown"] = max_dd
        
        # Calculate Sharpe ratio
        if len(self.daily_returns) > 1:
            returns_array = np.array(self.daily_returns)
            mean_return = np.mean(returns_array)
            std_return = np.std(returns_array)
            
            if std_return > 0:
                # Annualized Sharpe ratio (assuming daily returns)
                risk_free_rate = 0.02  # 2% annual
                self.metrics["sharpe_ratio"] = (mean_return - risk_free_rate / 252) / std_return * np.sqrt(252)
        
        # Calculate accuracy (simplified)
        accuracy = self._calculate_accuracy(trade_history, current_prices)
        
        return {
            "total_profit_loss": total_profit_loss,
            "total_return": total_return,
            "total_return_pct": total_return * 100,
            "metrics": self.metrics.copy(),
            "accuracy": accuracy,
            "portfolio_value": portfolio_value,
            "initial_capital": initial_capital,
            "best_stock": self._get_best_stock(trade_history),
            "recommendations": self._generate_recommendations()
        }
    
    def _calculate_accuracy(self, trade_history: List[Dict], current_prices: Dict[str, float]) -> float:
        """Calculate trading accuracy (simplified)"""
        if not trade_history:
            return 0.0
        
        # Count profitable trades
        profitable = 0
        total = 0
        
        for trade in trade_history:
            if trade.get("action") == "Sell":
                total += 1
                if trade.get("revenue", 0) > trade.get("cost", 0):
                    profitable += 1
        
        return (profitable / total * 100) if total > 0 else 0.0
    
    def _get_best_stock(self, trade_history: List[Dict]) -> str:
        """Get the best performing stock"""
        stock_profits = {}
        
        for trade in trade_history:
            symbol = trade.get("symbol", "")
            if symbol:
                if symbol not in stock_profits:
                    stock_profits[symbol] = 0.0
                
                if trade.get("action") == "Sell":
                    profit = trade.get("revenue", 0) - trade.get("cost", 0)
                    stock_profits[symbol] += profit
        
        if stock_profits:
            return max(stock_profits, key=stock_profits.get)
        return "N/A"
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on performance"""
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        try:
            from backend.config import (
                WIN_RATE_THRESHOLD,
                PROFIT_FACTOR_THRESHOLD,
                MAX_DRAWDOWN_THRESHOLD,
                SHARPE_RATIO_THRESHOLD
            )
        except ImportError:
            # Fallback if config not available
            WIN_RATE_THRESHOLD = 0.40
            PROFIT_FACTOR_THRESHOLD = 0.8
            MAX_DRAWDOWN_THRESHOLD = 0.25
            SHARPE_RATIO_THRESHOLD = 0.5
        
        recommendations = []
        
        # Check accuracy (using config threshold)
        if self.metrics.get("win_rate", 0) < WIN_RATE_THRESHOLD:
            recommendations.append("Low win rate detected. Consider retraining Analyst model or adjusting trading strategy.")
        
        # Check profit factor (using config threshold)
        if self.metrics.get("profit_factor", 0) < PROFIT_FACTOR_THRESHOLD:
            recommendations.append("Profit factor below threshold. Review risk management and entry/exit strategies.")
        
        # Check max drawdown (using config threshold)
        if self.metrics.get("max_drawdown", 0) > MAX_DRAWDOWN_THRESHOLD:
            recommendations.append("High drawdown detected. Consider reducing position sizes or tightening stop losses.")
        
        # Check Sharpe ratio (using config threshold)
        if self.metrics.get("sharpe_ratio", 0) < SHARPE_RATIO_THRESHOLD:
            recommendations.append("Low Sharpe ratio. Consider improving risk-adjusted returns.")
        
        if not recommendations:
            recommendations.append("Performance metrics are within acceptable ranges. Continue monitoring.")
        
        return recommendations
    
    def generate_report(self, performance_data: Dict[str, any]) -> str:
        """
        Generate a formatted performance report
        
        Args:
            performance_data: Performance evaluation data
        
        Returns:
            Formatted report string
        """
        report = f"""
===============================================================
              TRADING PERFORMANCE REPORT
===============================================================

PORTFOLIO METRICS
---------------------------------------------------------------
Initial Capital:     ${performance_data['initial_capital']:,.2f}
Current Value:       ${performance_data['portfolio_value']:,.2f}
Total P/L:           ${performance_data['total_profit_loss']:,.2f}
Total Return:        {performance_data['total_return_pct']:.2f}%

TRADING STATISTICS
---------------------------------------------------------------
Total Trades:        {performance_data['metrics']['total_trades']}
Successful Trades:   {performance_data['metrics']['successful_trades']}
Win Rate:            {performance_data['metrics']['win_rate']*100:.2f}%
Accuracy:            {performance_data['accuracy']:.2f}%

PROFIT ANALYSIS
---------------------------------------------------------------
Total Profit:        ${performance_data['metrics']['total_profit']:,.2f}
Total Loss:          ${performance_data['metrics']['total_loss']:,.2f}
Average Profit:      ${performance_data['metrics']['average_profit']:,.2f}
Average Loss:        ${performance_data['metrics']['average_loss']:,.2f}
Profit Factor:       {performance_data['metrics']['profit_factor']:.2f}

RISK METRICS
---------------------------------------------------------------
Max Drawdown:        {performance_data['metrics']['max_drawdown']*100:.2f}%
Sharpe Ratio:        {performance_data['metrics']['sharpe_ratio']:.2f}

BEST PERFORMER
---------------------------------------------------------------
Best Stock:          {performance_data['best_stock']}

RECOMMENDATIONS
---------------------------------------------------------------
"""
        for i, rec in enumerate(performance_data['recommendations'], 1):
            report += f"{i}. {rec}\n"
        
        report += "\n" + "="*60 + "\n"
        
        return report
    
    def get_weekly_summary(self) -> Dict[str, any]:
        """Get weekly performance summary"""
        if not self.performance_history:
            return {"error": "No performance data available"}
        
        # Get last 7 days of records
        week_ago = datetime.now() - timedelta(days=7)
        recent_records = [r for r in self.performance_history 
                         if r["timestamp"] >= week_ago]
        
        if not recent_records:
            return {"error": "No recent data"}
        
        start_value = recent_records[0]["portfolio_value"]
        end_value = recent_records[-1]["portfolio_value"]
        weekly_return = (end_value - start_value) / start_value if start_value > 0 else 0.0
        
        return {
            "period": "Last 7 days",
            "start_value": start_value,
            "end_value": end_value,
            "return": weekly_return,
            "return_pct": weekly_return * 100,
            "trades_count": len([r for r in self.trade_records 
                                if r["timestamp"] >= week_ago])
        }


if __name__ == "__main__":
    # Test the Auditor Agent
    auditor = AuditorAgent()
    
    # Simulate some records
    auditor.record(
        {"action": "Buy", "symbol": "AAPL", "shares": 10, "price": 150.0},
        portfolio_value=100000.0,
        initial_capital=100000.0
    )
    
    performance = auditor.evaluate_performance(
        portfolio_value=101000.0,
        initial_capital=100000.0,
        trade_history=[],
        current_prices={},
        portfolio={}
    )
    
    print(auditor.generate_report(performance))

