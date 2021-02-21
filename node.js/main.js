require("dotenv").config();

const body_parser = require("body-parser");
const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const store = require("./store");

const BET_TIMEOUT = 60; // should be 60
const PORT = 8080;

let last_seconds = 0;
let last_price = 0;

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

app.get("/rest/ticker/:ticker", async (req, res) => {
  res.json(await store.getTicker(req.params.ticker));
});

app.get("/rest/history/:ticker", async (req, res) => {
  res.json(await store.getHistory(req.params.ticker));
});

app.get("/rest/bets/:ticker", async (req, res) => {
  const userId = req.headers["auth-token"];
  if (!userId) return res.json(null);
  res.json(await store.getBets(req.params.ticker, userId));
});

app.post("/rest/bets/:ticker", async (req, res) => {
  if (!req.userId) return res.json(null);
  const bet = await store.newBet(req.params.ticker, req.userId, last_seconds, last_price, req.body.is_up);
  wssPrivateBroadcast(req.userId, "bet-insert", bet);
  setTimeout(async () => {
    bet.close_price = last_price;
    bet.close_seconds = last_seconds;
    if (bet.is_up) bet.win = bet.open_price < bet.close_price;
    else bet.win = bet.open_price > bet.close_price;
    await store.saveBet(bet);
    wssPrivateBroadcast(req.userId, "bet-resolve", bet);
    const diff = bet.win ? +1 : -1;
    const score = await store.diffScore(req.params.ticker, req.userId, diff);
    const scoreInfo = { ticker: req.params.ticker, score };
    wssPrivateBroadcast(req.userId, "update-score", scoreInfo);
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
    if (event.token) ws.userId = event.token;
  });
});

function wssPrivateBroadcast(userId, tag, data) {
  for (const ws of wss_private.clients) {
    if (ws.readyState === WebSocket.OPEN && ws.userId == userId) {
      ws.send(JSON.stringify({ tag, data }));
    }
  }
}

// TODO possibly simplify and avoid the queue.
require("./binance").connect("btcusdt", (ticker, seconds, price) => {
  wssPublicBroadcast("ticker#" + ticker, { ticker, seconds, price });
  last_seconds = seconds;
  last_price = price;
});
