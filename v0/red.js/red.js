const express = require("express");
const body_parser = require("body-parser");

class Ticker {
  // seconds: number;
  // price: number;
}

class Bet {
  // seconds: number;
  // price: number;
}

const state = {
  seconds: 0,
  // history: Array<Ticker> = [];
  // user_bets: Map<string, Bet> = new Map();
  // all_bets = []
};

(function timer() {
  state.seconds = Date.now() / 1000.0;
  setTimeout(timer);
})();

// API
const port = 6789;
const app = express();
// app.set("json spaces", 4);
app.listen(port, () => console.log("http://localhost:" + port));

app.get("/", (req, res) => {
  res.json(state);
});

app.post("/", body_parser.json(), (req, res) => {
  console.log(req.body);
  res.json(state);
});
