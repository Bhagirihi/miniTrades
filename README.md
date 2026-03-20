# Upstox Pro | Mean Reversion Trading Terminal 📈

A real-time, automated algorithmic trading terminal and paper-trading simulator built on Node.js and the Upstox Developer API.

This project connects directly to your Upstox account to monitor your live portfolio, calculate statistical probabilities for reversals, and automatically execute paper trades with strict risk management rules.

## 🚀 Key Features

### 1. Live Portfolio Terminal

- **Real-Time Data:** Streams live market data via Upstox WebSockets to continuously update your portfolio's LTP and Unrealized P&L.
- **Smart Averaging Calculator:** Automatically calculates exactly how many shares you need to buy to average down a losing position to 1% above the current market price.
- **Actionable Ideas:** Scans active holdings and a custom screener list to provide persistent "HOT TIPS" when high-probability setups occur.

### 2. Algorithmic Intelligence

The bot uses a dual-strategy system depending on the instrument type:

- **Standard Equity (Mean Reversion):** Uses a 20-period Simple Moving Average and Standard Deviation to calculate a **Z-Score**.
  - `STRONG BUY`: Z-Score < -2.5 (Heavily Oversold)
  - `STRONG SELL`: Z-Score > +2.5 (Heavily Overbought)
- **Indices / NIFTY (Momentum & Trend):** Uses 9 & 21 EMAs, 14-period RSI, and a custom Standard Deviation-based SuperTrend.
  - `STRONG BUY`: 9 EMA > 21 EMA + RSI > 55 + Bullish SuperTrend
  - `STRONG SELL`: 9 EMA < 21 EMA + RSI < 45 + Bearish SuperTrend

### 3. Advanced Paper Trading Simulator

Test the algorithmic strategies without risking real capital.

- **Virtual Wallet:** Starts with ₹100,000 in virtual cash.
- **Brokerage Simulation:** Accurately mimics Upstox intraday brokerage (0.05% or ₹20 max per trade) for hyper-realistic P&L tracking.
- **Strict Risk Management:**
  - Maximum 10% capital risk per trade.
  - Auto Take-Profit at **+1.5%**.
  - Auto Stop-Loss at **-0.5%**.
  - **Trailing Stop-Loss:** Tracks the high-water mark of a stock and auto-sells if it drops 0.5% from its peak.
- **Auto Square-Off:** Automatically liquidates all open paper positions at exactly **3:25 PM IST**.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla JS, HTML5, Bootstrap 5 (CSS)
- **Real-Time Comm:** Socket.io (UI Updates), `ws` (Upstox Market Feed)
- **Strategy Math:** `technicalindicators` library
- **API Integration:** Upstox API v2 (`axios`)

---

## ⚙️ Installation & Setup

### Prerequisites

1. Node.js installed (v16+ recommended).
2. An active Upstox Trading Account.
3. An Upstox Developer App created at Upstox API Console.

### Step 1: Clone the repository

```bash
git clone https://github.com/Bhagirihi/miniTrades.git
cd TRADE
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory and add your Upstox API credentials:

```ini
API_KEY=your_upstox_api_key_here
API_SECRET=your_upstox_api_secret_here
REDIRECT_URI=http://localhost:3000/callback
```

_(Note: Ensure your redirect URI exactly matches the one configured in your Upstox Developer Console)._

### Step 4: Run the Server

```bash
npm start
```

### Step 5: Authenticate

1. Open `http://localhost:3000` in your browser.
2. Click the **🔑 RE-AUTH** button in the top right corner.
3. Log in with your Upstox credentials to generate the daily access token.
4. Your terminal will instantly populate with your real holdings!

---

## ⚠️ Disclaimer

**This software is for educational and research purposes only.**

The algorithms and strategies provided do not constitute financial advice. The stock market is highly volatile, and algorithmic trading can result in significant financial loss. The creators of this software are not responsible for any monetary losses incurred while using this bot for live trading. Always backtest strategies thoroughly and use Paper Trading to verify logic before connecting real capital.
