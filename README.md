# ScalpMaster Spot Bot 🚀

This is an automated crypto scalping bot and dashboard designed for the Spot market. It analyzes market data, generates buy signals based on technical analysis (RSI, MACD, EMA, Whale Detection, Primo Strategy), and sends alerts to Telegram.

## 📂 Project Structure (أين تجد الكود)

Here are the most important files in your project:

### 🧠 Core Logic (الذكاء والتحليل)
- **`server.ts`**: The main brain. It runs the continuous loop, fetches data, manages active signals, and sends Telegram alerts.
- **`server/analysis.ts`**: Contains the trading strategies (Primo, Whale, RSI, MACD) and technical indicators. This is where the buy/sell decisions are made.

### 💻 Frontend (واجهة المستخدم)
- **`src/components/Dashboard.tsx`**: The main dashboard view showing active signals.
- **`src/components/SignalCard.tsx`**: The design of individual signal cards.

### ⚙️ Configuration (الإعدادات)
- **`package.json`**: Lists all the libraries and tools used (like `axios`, `ta-lib` equivalents, etc.).
- **`DEPLOY.md`**: Instructions on how to run this bot 24/7 on a cloud server.

## 🚀 How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server (Bot + UI):**
   ```bash
   npm run dev
   ```

3. **Open the Dashboard:**
   The app usually runs on port 3000. Open your browser to view the signals.

## ☁️ Deployment (Running 24/7)

Refer to **`DEPLOY.md`** for detailed instructions on how to deploy this to Render, Railway, or a VPS so it runs even when your computer is off.
