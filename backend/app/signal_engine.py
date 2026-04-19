import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Literal

SignalDirection = Literal["BUY", "SELL", "WAIT"]


@dataclass
class Signal:
    symbol: str
    asset_type: str  # stock | crypto | forex
    direction: SignalDirection
    score: float  # 0-100 confluence score
    entry: float
    stop_loss: float
    take_profit: float
    timeframe: str
    reasons: list[str]
    rsi: float
    macd_hist: float
    ema_trend: str


def _ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _macd(close: pd.Series):
    fast = _ema(close, 12)
    slow = _ema(close, 26)
    macd_line = fast - slow
    signal_line = _ema(macd_line, 9)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def _bollinger(close: pd.Series, period: int = 20, std: float = 2.0):
    mid = close.rolling(period).mean()
    std_dev = close.rolling(period).std()
    upper = mid + std * std_dev
    lower = mid - std * std_dev
    return upper, mid, lower


def _volume_spike(volume: pd.Series, lookback: int = 20) -> bool:
    if len(volume) < lookback + 1:
        return False
    avg_vol = volume.iloc[-(lookback + 1):-1].mean()
    return volume.iloc[-1] > avg_vol * 1.5


def _candlestick_pattern(df: pd.DataFrame) -> tuple[str, float]:
    """Returns (pattern_name, score_delta). Positive = bullish, negative = bearish."""
    o, h, l, c = df["open"].iloc[-1], df["high"].iloc[-1], df["low"].iloc[-1], df["close"].iloc[-1]
    prev_o, prev_c = df["open"].iloc[-2], df["close"].iloc[-2]
    body = abs(c - o)
    full_range = h - l if h != l else 0.0001
    lower_wick = (min(o, c) - l)
    upper_wick = (h - max(o, c))

    # Bullish hammer
    if lower_wick > body * 2 and upper_wick < body * 0.5 and c > o:
        return "Hammer", 10.0
    # Bearish shooting star
    if upper_wick > body * 2 and lower_wick < body * 0.5 and c < o:
        return "Shooting Star", -10.0
    # Bullish engulfing
    if prev_c < prev_o and c > o and c > prev_o and o < prev_c:
        return "Bullish Engulfing", 12.0
    # Bearish engulfing
    if prev_c > prev_o and c < o and c < prev_o and o > prev_c:
        return "Bearish Engulfing", -12.0
    # Doji
    if body / full_range < 0.1:
        return "Doji", 0.0
    return "None", 0.0


def _support_resistance(close: pd.Series, lookback: int = 50) -> tuple[float, float]:
    window = close.tail(lookback)
    support = window.min()
    resistance = window.max()
    return support, resistance


def analyze(symbol: str, df: pd.DataFrame, asset_type: str, timeframe: str = "15m") -> Signal | None:
    if df is None or len(df) < 50:
        return None

    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df.get("volume", pd.Series(dtype=float))

    ema9 = _ema(close, 9)
    ema21 = _ema(close, 21)
    ema50 = _ema(close, 50)
    rsi = _rsi(close)
    macd_line, signal_line, macd_hist = _macd(close)
    bb_upper, bb_mid, bb_lower = _bollinger(close)
    candle_name, candle_score = _candlestick_pattern(df)
    support, resistance = _support_resistance(close)

    price = close.iloc[-1]
    rsi_val = rsi.iloc[-1]
    macd_hist_val = macd_hist.iloc[-1]
    macd_hist_prev = macd_hist.iloc[-2]
    ema9_val = ema9.iloc[-1]
    ema21_val = ema21.iloc[-1]
    ema50_val = ema50.iloc[-1]

    bull_score = 0.0
    bear_score = 0.0
    reasons = []

    # --- EMA trend (25 pts) ---
    if ema9_val > ema21_val > ema50_val:
        bull_score += 25
        reasons.append("EMA bullish stack (9>21>50)")
        ema_trend = "BULLISH"
    elif ema9_val < ema21_val < ema50_val:
        bear_score += 25
        reasons.append("EMA bearish stack (9<21<50)")
        ema_trend = "BEARISH"
    elif ema9_val > ema21_val:
        bull_score += 10
        ema_trend = "MILD BULLISH"
    elif ema9_val < ema21_val:
        bear_score += 10
        ema_trend = "MILD BEARISH"
    else:
        ema_trend = "NEUTRAL"

    # --- RSI (20 pts) ---
    if rsi_val < 35:
        bull_score += 20
        reasons.append(f"RSI oversold ({rsi_val:.1f})")
    elif rsi_val > 65:
        bear_score += 20
        reasons.append(f"RSI overbought ({rsi_val:.1f})")
    elif 45 <= rsi_val <= 55:
        pass  # neutral

    # --- MACD crossover (20 pts) ---
    if macd_hist_val > 0 and macd_hist_prev <= 0:
        bull_score += 20
        reasons.append("MACD bullish crossover")
    elif macd_hist_val < 0 and macd_hist_prev >= 0:
        bear_score += 20
        reasons.append("MACD bearish crossover")
    elif macd_hist_val > 0:
        bull_score += 8
    elif macd_hist_val < 0:
        bear_score += 8

    # --- Bollinger Bands (15 pts) ---
    if price <= bb_lower.iloc[-1]:
        bull_score += 15
        reasons.append("Price at lower Bollinger Band")
    elif price >= bb_upper.iloc[-1]:
        bear_score += 15
        reasons.append("Price at upper Bollinger Band")

    # --- Volume spike (10 pts) ---
    if not volume.empty and _volume_spike(volume):
        reasons.append("Volume spike detected")
        if bull_score > bear_score:
            bull_score += 10
        else:
            bear_score += 10

    # --- Candlestick pattern (up to 12 pts) ---
    if candle_name != "None":
        reasons.append(f"Pattern: {candle_name}")
        if candle_score > 0:
            bull_score += candle_score
        elif candle_score < 0:
            bear_score += abs(candle_score)

    # --- Support/Resistance proximity (8 pts) ---
    proximity_pct = 0.005  # 0.5%
    if abs(price - support) / price < proximity_pct:
        bull_score += 8
        reasons.append("Near support level")
    elif abs(price - resistance) / price < proximity_pct:
        bear_score += 8
        reasons.append("Near resistance level")

    # --- Determine direction and score ---
    # Max possible raw score: 25 EMA + 20 RSI + 20 MACD + 15 BB + 10 vol + 12 candle + 8 S/R = 110
    _MAX_RAW = 110.0

    total = bull_score + bear_score
    if total == 0:
        return None

    if bull_score > bear_score:
        direction: SignalDirection = "BUY"
        score = (bull_score / _MAX_RAW) * 100
    elif bear_score > bull_score:
        direction = "SELL"
        score = (bear_score / _MAX_RAW) * 100
    else:
        direction = "WAIT"
        score = 0

    # Minimum confluence threshold — at least 40 pts
    if max(bull_score, bear_score) < 40:
        direction = "WAIT"
        score = (max(bull_score, bear_score) / _MAX_RAW) * 100

    atr = (high - low).tail(14).mean()
    if direction == "BUY":
        stop_loss = round(price - atr * 1.5, 5)
        take_profit = round(price + atr * 3.0, 5)
    elif direction == "SELL":
        stop_loss = round(price + atr * 1.5, 5)
        take_profit = round(price - atr * 3.0, 5)
    else:
        stop_loss = round(price - atr, 5)
        take_profit = round(price + atr, 5)

    return Signal(
        symbol=symbol,
        asset_type=asset_type,
        direction=direction,
        score=round(min(score, 100), 1),
        entry=round(price, 5),
        stop_loss=stop_loss,
        take_profit=take_profit,
        timeframe=timeframe,
        reasons=reasons,
        rsi=round(rsi_val, 2),
        macd_hist=round(macd_hist_val, 6),
        ema_trend=ema_trend,
    )
