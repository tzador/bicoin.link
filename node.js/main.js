require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const body_parser = require("body-parser");

const port = 8080;

const app = express();
app.set("json spaces", 4);
app.use(express.static("../vanilla.js"));

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

const store = require("./store");

// # REST API
app.use(body_parser.json());

app.get("/score/:ticker", async (req, res) => {
  const user_id = req.headers["auth-token"];
  if (!user_id) return res.json(null);
  res.json(await store.getScore(req.params.ticker, user_id));
});

app.post("/score/:ticker", async (req, res) => {
  const user_id = req.headers["auth-token"];
  if (!user_id) return res.json(null);
  if (req.body.reset) {
    res.json(await store.setScore(req.params.ticker, user_id, 0));
  } else if (req.body.diff) {
    res.json(await store.diffScore(req.params.ticker, user_id, req.body.diff));
  } else res.json(null);
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

// TODO possibly simplify and avoid the queue.
require("./binance").connect(wssPublicBroadcast);
