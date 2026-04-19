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


def _candlestick_patterns(df: pd.DataFrame) -> list[tuple[str, float]]:
    """Returns list of (pattern_name, score_delta). Positive = bullish, negative = bearish."""
    if len(df) < 3:
        return []

    o0, h0, l0, c0 = df["open"].iloc[-1], df["high"].iloc[-1], df["low"].iloc[-1], df["close"].iloc[-1]
    o1, h1, l1, c1 = df["open"].iloc[-2], df["high"].iloc[-2], df["low"].iloc[-2], df["close"].iloc[-2]
    o2, h2, l2, c2 = df["open"].iloc[-3], df["high"].iloc[-3], df["low"].iloc[-3], df["close"].iloc[-3]

    body0 = abs(c0 - o0)
    body1 = abs(c1 - o1)
    body2 = abs(c2 - o2)
    rng0 = h0 - l0 if h0 != l0 else 1e-9
    rng1 = h1 - l1 if h1 != l1 else 1e-9

    upper_wick0 = h0 - max(o0, c0)
    lower_wick0 = min(o0, c0) - l0
    upper_wick1 = h1 - max(o1, c1)
    lower_wick1 = min(o1, c1) - l1

    bull0 = c0 > o0
    bear0 = c0 < o0
    bull1 = c1 > o1
    bear1 = c1 < o1
    bull2 = c2 > o2
    bear2 = c2 < o2

    # Trend context: compare last close vs 5 bars ago
    recent_up = c0 > df["close"].iloc[-6] if len(df) >= 6 else bull0
    recent_down = not recent_up

    doji0 = body0 / rng0 < 0.1
    doji1 = body1 / rng1 < 0.1

    patterns: list[tuple[str, float]] = []

    # ── Single-candle ──────────────────────────────────────────
    # Hammer / Hanging Man (same shape, context decides direction)
    if lower_wick0 > body0 * 2 and upper_wick0 < body0 * 0.5 and body0 > 0:
        if recent_down:
            patterns.append(("Hammer", 10.0))
        else:
            patterns.append(("Hanging Man", -8.0))

    # Inverted Hammer / Shooting Star
    if upper_wick0 > body0 * 2 and lower_wick0 < body0 * 0.5 and body0 > 0:
        if recent_down:
            patterns.append(("Inverted Hammer", 7.0))
        else:
            patterns.append(("Shooting Star", -10.0))

    # Bullish Marubozu — strong bull candle, tiny wicks
    if bull0 and body0 / rng0 > 0.85:
        patterns.append(("Bullish Marubozu", 9.0))

    # Bearish Marubozu
    if bear0 and body0 / rng0 > 0.85:
        patterns.append(("Bearish Marubozu", -9.0))

    # Dragonfly Doji — open ≈ close ≈ high, long lower wick
    if doji0 and lower_wick0 > rng0 * 0.6 and upper_wick0 < rng0 * 0.1:
        patterns.append(("Dragonfly Doji", 8.0))

    # Gravestone Doji — open ≈ close ≈ low, long upper wick
    if doji0 and upper_wick0 > rng0 * 0.6 and lower_wick0 < rng0 * 0.1:
        patterns.append(("Gravestone Doji", -8.0))

    # Standard Doji (indecision — slight bias by context)
    if doji0 and not patterns:
        score = 3.0 if recent_down else -3.0
        patterns.append(("Doji", score))

    # Spinning Top — small body, wicks on both sides
    if body0 / rng0 < 0.3 and upper_wick0 > body0 and lower_wick0 > body0 and not doji0:
        patterns.append(("Spinning Top", 2.0 if recent_down else -2.0))

    # ── Two-candle ────────────────────────────────────────────
    # Bullish Engulfing
    if bear1 and bull0 and c0 > o1 and o0 < c1:
        patterns.append(("Bullish Engulfing", 12.0))

    # Bearish Engulfing
    if bull1 and bear0 and c0 < o1 and o0 > c1:
        patterns.append(("Bearish Engulfing", -12.0))

    # Bullish Harami — small bull candle inside prior bearish
    if bear1 and bull0 and o0 > c1 and c0 < o1 and body0 < body1 * 0.5:
        patterns.append(("Bullish Harami", 8.0))

    # Bearish Harami
    if bull1 and bear0 and o0 < c1 and c0 > o1 and body0 < body1 * 0.5:
        patterns.append(("Bearish Harami", -8.0))

    # Piercing Line — bearish candle, then bull that closes above midpoint
    mid1 = (o1 + c1) / 2
    if bear1 and bull0 and o0 < c1 and c0 > mid1 and c0 < o1:
        patterns.append(("Piercing Line", 10.0))

    # Dark Cloud Cover
    mid1b = (o1 + c1) / 2
    if bull1 and bear0 and o0 > c1 and c0 < mid1b and c0 > o1:
        patterns.append(("Dark Cloud Cover", -10.0))

    # Tweezer Bottom — two candles with same low (within 0.1%)
    if abs(l0 - l1) / (l0 + 1e-9) < 0.001 and bear1 and bull0:
        patterns.append(("Tweezer Bottom", 7.0))

    # Tweezer Top
    if abs(h0 - h1) / (h0 + 1e-9) < 0.001 and bull1 and bear0:
        patterns.append(("Tweezer Top", -7.0))

    # ── Three-candle ──────────────────────────────────────────
    # Morning Star — bear, small/doji, bull that recovers above midpoint
    mid2 = (o2 + c2) / 2
    if bear2 and (doji1 or body1 < body2 * 0.3) and bull0 and c0 > mid2:
        patterns.append(("Morning Star", 15.0))

    # Evening Star
    mid2b = (o2 + c2) / 2
    if bull2 and (doji1 or body1 < body2 * 0.3) and bear0 and c0 < mid2b:
        patterns.append(("Evening Star", -15.0))

    # Three White Soldiers — three consecutive bullish candles, each closes higher
    if bull0 and bull1 and bull2 and c0 > c1 > c2 and o0 > o1 > o2:
        patterns.append(("Three White Soldiers", 14.0))

    # Three Black Crows
    if bear0 and bear1 and bear2 and c0 < c1 < c2 and o0 < o1 < o2:
        patterns.append(("Three Black Crows", -14.0))

    # Three Inside Up — bearish, bullish engulfing, bullish close above
    if bear2 and bull1 and c1 > o2 and o1 < c2 and bull0 and c0 > c1:
        patterns.append(("Three Inside Up", 12.0))

    # Three Inside Down
    if bull2 and bear1 and c1 < o2 and o1 > c2 and bear0 and c0 < c1:
        patterns.append(("Three Inside Down", -12.0))

    # Abandoned Baby Bull — gap down doji, then gap up bullish
    if bear2 and doji1 and h1 < l2 and bull0 and l0 > h1:
        patterns.append(("Abandoned Baby Bull", 15.0))

    # Abandoned Baby Bear
    if bull2 and doji1 and l1 > h2 and bear0 and h0 < l1:
        patterns.append(("Abandoned Baby Bear", -15.0))

    return patterns


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
    detected_patterns = _candlestick_patterns(df)
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

    # --- Candlestick patterns (capped at 20 pts total) ---
    candle_bull = min(sum(s for _, s in detected_patterns if s > 0), 20.0)
    candle_bear = min(sum(abs(s) for _, s in detected_patterns if s < 0), 20.0)
    bull_score += candle_bull
    bear_score += candle_bear
    for name, _ in detected_patterns:
        reasons.append(f"Pattern: {name}")

    # --- Support/Resistance proximity (8 pts) ---
    proximity_pct = 0.005  # 0.5%
    if abs(price - support) / price < proximity_pct:
        bull_score += 8
        reasons.append("Near support level")
    elif abs(price - resistance) / price < proximity_pct:
        bear_score += 8
        reasons.append("Near resistance level")

    # --- Determine direction and score ---
    # Max possible raw score: 25 EMA + 20 RSI + 20 MACD + 15 BB + 10 vol + 20 candle + 8 S/R = 118
    _MAX_RAW = 118.0

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

    # 20-bar ATR for swing-stable readings
    atr = (high - low).tail(20).mean()

    # Wider stops on longer timeframes — swing trades need room to breathe
    sl_mult = {"15m": 2.0, "30m": 2.5, "1h": 3.0}.get(timeframe, 2.0)
    tp_mult = sl_mult * 2  # 1:2 R:R baseline

    # Minimum % floors so week+ swing targets are actually meaningful
    # ATR on short candles is tiny — these ensure the levels are worth holding for
    _sl_floor, _tp_floor = {
        "stock":  (0.03, 0.08),
        "crypto": (0.05, 0.12),
        "forex":  (0.01, 0.025),
    }.get(asset_type, (0.03, 0.08))

    if direction == "BUY":
        sl_atr = price - atr * sl_mult
        tp_atr = price + atr * tp_mult
        stop_loss  = round(min(sl_atr, price * (1 - _sl_floor)), 5)  # wider of the two
        take_profit = round(max(tp_atr, price * (1 + _tp_floor)), 5)  # higher of the two
    elif direction == "SELL":
        sl_atr = price + atr * sl_mult
        tp_atr = price - atr * tp_mult
        stop_loss  = round(max(sl_atr, price * (1 + _sl_floor)), 5)
        take_profit = round(min(tp_atr, price * (1 - _tp_floor)), 5)
    else:
        stop_loss  = round(price - atr * 1.5, 5)
        take_profit = round(price + atr * 1.5, 5)

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
