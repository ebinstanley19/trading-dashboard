import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .scanner import run_scan, get_cached_signals
from .data_feeds import fetch_stock_price, fetch_crypto_price, fetch_forex_price

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT = os.getenv("TELEGRAM_CHAT_ID", "")
SCAN_INTERVAL = 300  # seconds between 15m scans; 30m runs every 2nd tick, 1h every 6th


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_background_scanner())
    yield
    task.cancel()


app = FastAPI(title="Trading Signal Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ws_clients: list[WebSocket] = []


async def _background_scanner():
    tick = 0
    while True:
        try:
            timeframes_to_scan = ["15m"]
            if tick % 2 == 0:
                timeframes_to_scan.append("30m")
            if tick % 6 == 0:
                timeframes_to_scan.append("1h")

            for tf in timeframes_to_scan:
                signals = await run_scan(tf, TELEGRAM_TOKEN, TELEGRAM_CHAT)
                _, scan_time = get_cached_signals(tf)
                await _broadcast({"type": "signals", "timeframe": tf, "data": signals, "last_scan": scan_time})
        except Exception as e:
            print(f"Scanner error: {e}")
        tick += 1
        await asyncio.sleep(SCAN_INTERVAL)


async def _broadcast(message: dict):
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/signals")
async def get_signals(timeframe: str = "15m"):
    signals, scan_time = get_cached_signals(timeframe)
    if not signals:
        signals = await run_scan(timeframe, TELEGRAM_TOKEN, TELEGRAM_CHAT)
        _, scan_time = get_cached_signals(timeframe)
    return {"signals": signals, "last_scan": scan_time}


@app.post("/api/scan")
async def trigger_scan(timeframe: str = "15m"):
    signals = await run_scan(timeframe, TELEGRAM_TOKEN, TELEGRAM_CHAT)
    _, scan_time = get_cached_signals(timeframe)
    return {"signals": signals, "last_scan": scan_time}


@app.get("/api/price/{asset_type}/{symbol}")
async def get_price(asset_type: str, symbol: str):
    if asset_type == "stock":
        price = await fetch_stock_price(symbol)
    elif asset_type == "crypto":
        price = await fetch_crypto_price(symbol)
    else:
        price = await fetch_forex_price(symbol)
    return {"symbol": symbol, "price": price}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        # Push all cached timeframes immediately on connect
        for tf in ["15m", "30m", "1h"]:
            signals, scan_time = get_cached_signals(tf)
            if signals:
                await websocket.send_json({"type": "signals", "timeframe": tf, "data": signals, "last_scan": scan_time})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
