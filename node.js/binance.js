const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";

const WebSocket = require("ws");
const store = require("./store");

let last_seconds = 0;
let last_price = 0;

exports.connect = (ticker, wssPublicBroadcast) => {
  const queue = [];
  (async function processBinance() {
    while (queue.length) {
      const { seconds, price } = queue.shift();
      if (last_seconds && Math.floor(last_seconds) != Math.floor(seconds)) {
        const seconds_floor = Math.floor(seconds);
        store.setTicker(ticker, seconds_floor, last_price);
        wssPublicBroadcast("ticker#" + ticker, {
          ticker,
          seconds: seconds_floor,
          price: last_price,
        });
      }
      last_seconds = seconds;
      last_price = price;
    }
    setTimeout(processBinance, 1);
  })();
  (async function connect_to_binance() {
    const ws = new WebSocket(BINANCE_WS_URL);
    ws.on("close", () => setTimeout(connect_to_binance, 100));
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const seconds = data.T / 1000.0;
      const price = parseFloat(data.p);
      queue.push({ seconds, price });
    });
  })();
};
