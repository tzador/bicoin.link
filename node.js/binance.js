const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";

const WebSocket = require("ws");
const store = require("./store");

let last_time = 0;
let last_price = 0;

exports.connect = (wssPublicBroadcast) => {
  const queue = [];
  (async function processBinance() {
    while (queue.length) {
      const { time, price } = queue.shift();
      if (last_time && Math.floor(last_time) != Math.floor(time)) {
        const seconds = Math.floor(time);
        store.set_ticker(ticker, seconds, last_price);
        wssPublicBroadcast("ticker#" + ticker, {
          ticker,
          seconds,
          price: last_price,
        });
      }
      last_time = time;
      last_price = price;
    }
    setTimeout(processBinance, 1); // TODO replace with process.nextTick
  })();
  (async function connect_to_binance() {
    const ws = new WebSocket(BINANCE_WS_URL);
    ws.on("close", () => setTimeout(connect_to_binance, 100));
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const time = data.T / 1000.0;
      const price = parseFloat(data.p);
      queue.push({ time, price });
    });
  })();
};
