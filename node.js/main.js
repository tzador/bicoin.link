const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const Redis = require("ioredis");
const uuid = require("uuid");
const body_parser = require("body-parser");

const port = 8080;
const binance_ws_url = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";
const history_length = 60 * 10;
const ticker = "btcusdt";

let last_time = 0;
let last_price = 0;

const app = express();
app.set("json spaces", 4);
app.use(express.static("vanilla.js"));

const server = http.createServer(app);
server.listen(port, () => console.log("http://localhost:" + port));

const wss_public = new WebSocket.Server({ noServer: true });
const wss_private = new WebSocket.Server({ noServer: true });

server.on("upgrade", function upgrade(req, socket, head) {
  if (req.url === "/ws/public") {
    wss_public.handleUpgrade(req, socket, head, (ws) => {
      wss_public.emit("connection", ws, req);
    });
  } else if (req.url === "/ws/private") {
    wss_private.handleUpgrade(req, socket, head, (ws) => {
      wss_private.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// # Store
class RedisStore {
  constructor(redis) {
    this.redis = redis;
  }

  async set_ticker(ticker, seconds, price) {
    const json = JSON.stringify({ ticker, seconds, price });
    await this.redis.set("ticker#" + ticker, json);
    await this.redis.zadd("history#" + ticker, seconds, json);
  }

  async getTicker(ticker) {
    const value = await this.redis.get("ticker#" + ticker);
    return JSON.parse(value);
  }

  async getHistory(ticker) {
    return (await this.redis.zrange("history#" + ticker, -history_length, -1)).map(JSON.parse);
  }

  async getBets(ticker, user_id) {
    const key = "bets#" + ticker + "#" + user_id;
    return (await this.redis.zrange(key, 0, -1)).map(JSON.parse);
  }

  async putBet(ticker, user_id, is_up) {
    const seconds = Math.ceil(last_time);
    const bet = {
      bet_id: uuid.v4(),
      user_id,
      seconds,
      is_up,
      open_price: last_price,
      close_price: null,
      win: null,
    };
    const key = "bets#" + ticker + "#" + user_id;
    await this.redis.zadd(key, seconds, JSON.stringify(bet));
    wssPrivateBroadcast(user_id, "bet-update", bet);
    setTimeout(async () => {
      const close_ticker = JSON.parse(await this.redis.get("ticker#" + ticker));
      // update the bet
      // store it back to user bets table
      // delete it from root bets table
      wssPrivateBroadcast(user_id, "bet-resolve", bet);
    }, 1000 * 5);
    return bet;
  }
}
const store = new RedisStore(new Redis(process.env.REDIS_URL));

// # REST API
app.get("/rest/ticker/:ticker", async (req, res) => {
  res.json(await store.getTicker(req.params.ticker));
});

app.get("/rest/history/:ticker", async (req, res) => {
  res.json(await store.getHistory(req.params.ticker));
});

app.get("/rest/bets/:ticker", async (req, res) => {
  const user_id = req.headers["auth-token"];
  if (!user_id) return res.json(null);
  res.json(await store.getBets(req.params.ticker, user_id));
});

app.post("/rest/bets/:ticker", body_parser.json(), async (req, res) => {
  const user_id = req.headers["auth-token"];
  if (!user_id) return res.json(null);
  console.log(req.params);
  res.json(await store.putBet(req.params.ticker, user_id, req.body.is_up));
});

// # Public WebSocket API
wss_public.on("connection", function connection(ws) {
  ws.send(JSON.stringify({ tag: "hello", data: "public" }));
});

function wssPublicBroadcast(tag, data) {
  for (const ws of wss_public.clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ tag, data }));
    }
  }
}

// # Private WebSocket API
wss_private.on("connection", function connection(ws) {
  ws.on("message", function connection(message) {
    const event = JSON.parse(message);
    if (event.token) ws.user_id = event.token;
  });
});

function wssPrivateBroadcast(user_id, tag, data) {
  for (const ws of wss_private.clients) {
    if (ws.readyState === WebSocket.OPEN && ws.user_id == user_id) {
      ws.send(JSON.stringify({ tag, data }));
    }
  }
}

// # Binance
// TODO possibly simplify and avoid the queue.
(function connectToBinance() {
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
    const ws = new WebSocket(binance_ws_url);
    ws.on("close", () => setTimeout(connect_to_binance, 100));
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      const time = data.T / 1000.0;
      const price = parseFloat(data.p);
      queue.push({ time, price });
    });
  })();
})();
