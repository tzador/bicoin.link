require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const body_parser = require("body-parser");

const BET_TIMEOUT = 5; // should be 60
const PORT = 8080;

const app = express();
app.set("json spaces", 4);
app.use(express.static("../vanilla.js"));

const server = http.createServer(app);
server.listen(PORT, () => console.log("http://localhost:" + PORT));

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

const store = require("./store");
const { Console } = require("console");

// # REST API

app.use(body_parser.json());
app.use((req, res, next) => {
  req.userId = req.headers["auth-token"] || null;
  next();
});

app.get("/rest/score/:ticker", async (req, res) => {
  if (!req.userId) return res.json(null);
  res.json(await store.getScore(req.params.ticker, req.userId));
});

app.post("/rest/score/:ticker", async (req, res) => {
  if (!req.userId) return res.json(null);
  let newScore;
  if (req.body.reset) {
    newScore = await store.setScore(req.params.ticker, req.userId, 0);
  } else if (req.body.diff) {
    newScore = await store.diffScore(req.params.ticker, req.userId, req.body.diff);
  } else return res.json(null);
  const scoreInfo = { ticker: req.params.ticker, score: newScore };
  wssPrivateBroadcast(req.userId, "update-score", scoreInfo);
  res.json(scoreInfo);
});

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

app.post("/rest/bets/:ticker", async (req, res) => {
  const user_id = req.headers["auth-token"];
  if (!user_id) return res.json(null);
  const bet = await store.newBet(req.params.ticker, user_id, req.body.is_up);
  wssPrivateBroadcast(user_id, "bet-update", bet);
  setTimeout(async () => {
    // const close_ticker = JSON.parse(await redis.get("ticker#" + ticker));
    // update the bet
    // store it back to user bets table
    // delete it from root bets table
    console.log("bet-resolve", bet);
    // wssPrivateBroadcast(user_id, "bet-resolve", bet);
  }, 1000 * BET_TIMEOUT);
  res.json(bet);
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

// TODO possibly simplify and avoid the queue.
require("./binance").connect("btcusdt", wssPublicBroadcast);
