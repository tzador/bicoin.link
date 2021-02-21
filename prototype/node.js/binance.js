const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";

const WebSocket = require("ws");
const store = require("./store");

const RECONNECT_TIMEOUT_MS = 100;

let lastSeconds = 0;
let lastPrice = 0;

exports.connect = (ticker, callback) => {
  (function reconnect() {
    const ws = new WebSocket(BINANCE_WS_URL);
    ws.on("close", () => setTimeout(reconnect, RECONNECT_TIMEOUT_MS));
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const seconds = data.T / 1000.0;
      const price = parseFloat(data.p);
      if (lastSeconds && Math.floor(lastSeconds) != Math.floor(seconds)) {
        const secondsRounded = Math.floor(seconds);
        store.setTicker(ticker, secondsRounded, lastPrice);
        callback(ticker, secondsRounded, lastPrice);
      }
      lastSeconds = seconds;
      lastPrice = price;
    });
  })();
};
