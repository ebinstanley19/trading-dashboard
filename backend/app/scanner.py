import asyncio
from dataclasses import asdict
from datetime import datetime, timezone

from .data_feeds import (
    TOP_US_STOCKS, TOP_CRYPTO, TOP_FOREX,
    fetch_stock_candles, fetch_crypto_candles, fetch_forex_candles,
)
from .signal_engine import analyze, Signal

# Keyed by timeframe -> (signals, scan_time)
_cache: dict[str, tuple[list[dict], str]] = {}


async def _scan_asset(symbol: str, asset_type: str, timeframe: str) -> Signal | None:
    if asset_type == "stock":
        df = await fetch_stock_candles(symbol, timeframe)
    elif asset_type == "crypto":
        df = await fetch_crypto_candles(symbol, timeframe)
    else:
        df = await fetch_forex_candles(symbol, timeframe)

    if df is None:
        return None
    return analyze(symbol, df, asset_type, timeframe)


async def run_scan(timeframe: str = "15m", telegram_token: str = "", telegram_chat: str = "") -> list[dict]:
    global _cache

    # Scan asset classes sequentially — yfinance (thread executor) and Binance (async)
    # calls compete for the event loop when all 88 fire simultaneously, causing timeouts.
    signals = []
    for asset_type, symbols in [("stock", TOP_US_STOCKS), ("crypto", TOP_CRYPTO), ("forex", TOP_FOREX)]:
        results = await asyncio.gather(
            *[_scan_asset(s, asset_type, timeframe) for s in symbols],
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Signal):
                signals.append(r)

    signals.sort(key=lambda x: (x.direction != "WAIT", x.score), reverse=True)

    top = [s for s in signals if s.direction != "WAIT"][:20]
    scan_time = datetime.now(timezone.utc).isoformat()
    _cache[timeframe] = ([asdict(s) for s in signals], scan_time)

    if telegram_token and telegram_chat:
        await _send_telegram(top[:5], telegram_token, telegram_chat)

    return _cache[timeframe][0]


async def _send_telegram(signals: list[Signal], token: str, chat_id: str):
    if not signals:
        return

    lines = ["*📊 Trading Signals — Top Setups*\n"]
    for s in signals:
        emoji = "🟢" if s.direction == "BUY" else "🔴"
        lines.append(
            f"{emoji} *{s.symbol}* ({s.asset_type.upper()}) — *{s.direction}*\n"
            f"  Score: `{s.score}/100` | TF: `{s.timeframe}`\n"
            f"  Entry: `{s.entry}` | SL: `{s.stop_loss}` | TP: `{s.take_profit}`\n"
            f"  RSI: `{s.rsi}` | Trend: `{s.ema_trend}`\n"
            f"  Reasons: _{', '.join(s.reasons)}_\n"
        )

    text = "\n".join(lines)
    import aiohttp
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10))
    except Exception:
        pass


def get_cached_signals(timeframe: str = "15m") -> tuple[list[dict], str]:
    return _cache.get(timeframe, ([], ""))
