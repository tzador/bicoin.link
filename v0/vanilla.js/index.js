const TOKEN = "auth_token";
const WS_BASE_URL = location.protocol.replace("http", "ws") + "//" + location.host;
const PUBLIC_WS_URL = WS_BASE_URL + "/ws/public";
const PRIVATE_WS_URL = WS_BASE_URL + "/ws/private";
const binance_ws_url = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";
const rest_base_url = "";
const RECONNECT_TIMEOUT = 1000;

const state = {
  token: localStorage.getItem(TOKEN) || null,
  ticker: { ticker: "btcusdt", seconds: 0, price: 0 },
  history: [],
  bets: [],
  score: 0,
};

let public_ws = null;
let private_ws = null;

(function boot() {
  reconnectPublicWS();
  reconnectPrivateWS();
  fetchHistory();
  fetchBets();
  fetchScore();
})();

// # UI Actions
function login() {
  state.token = prompt("Enter a nickname:") || null;
  if (state.token) {
    state.token = state.token.trim();
    localStorage.setItem(TOKEN, state.token);
  } else localStorage.removeItem(TOKEN);
  reconnectPrivateWS();
  fetchBets();
  fetchScore();
}

function logout() {
  state.token = null;
  state.bets = [];
  localStorage.removeItem(TOKEN);
  reconnectPrivateWS();
}

async function placeBet(is_up) {
  restPost("/rest/bets/btcusdt", { is_up });
}

// # Mirror state to DOM
// React would be nice here
{
  const tickerEl = document.getElementById("ticker");
  const loginEl = document.getElementById("login");
  const logoutEl = document.getElementById("logout");
  const buttonsEl = document.getElementById("buttons");
  const scoreEl = document.getElementById("the-score");
  let last_auth_token = -1;
  let last_ticker_seconds = -1;
  let last_score = null;

  (function mirror() {
    if (last_auth_token != state.token) {
      last_auth_token = state.token;
      if (state.token) {
        loginEl.style.display = "none";
        logoutEl.style.display = "block";
        logoutEl.innerHTML = "@" + state.token + " <span style='color: dodgerblue'>Logout</span>";
        scoreEl.style.display = "block";
      } else {
        loginEl.style.display = "block";
        logoutEl.style.display = "none";
        logoutEl.style.innerText = "";
        scoreEl.style.display = "none";
      }
    }
    // TODO: Update only lazily when changed
    let hasActiveBets = false;
    for (const bet of state.bets) {
      if (bet.win === null) hasActiveBets = true;
    }
    if (hasActiveBets) buttonsEl.style.display = "none";
    else if (state.token) buttonsEl.style.display = "flex";

    if (last_score == null || last_score != state.score) {
      scoreEl.innerText = "⭐" + state.score;
      last_score = state.score;
    }

    if (last_ticker_seconds != state.ticker.seconds) {
      last_ticker_seconds = state.ticker.seconds;
      const date = format_date(state.ticker.seconds);
      let price_str = state.ticker.price.toFixed(3).toString();
      while (price_str.length < 9) price_str = price_str + "0";
      const ticker_value = `${date} 1BTC=<span style="color: white">${price_str}</span>USDT`;
      tickerEl.innerHTML = ticker_value;
    }

    requestAnimationFrame(mirror);
  })();
}

// # WebSocket Server
// TODO: abstract these common bits away
function reconnectPublicWS() {
  console.log("reconnectPublicWS");
  if (public_ws) public_ws.close();
  public_ws = new WebSocket(PUBLIC_WS_URL);
  public_ws.onclose = () => setTimeout(reconnectPublicWS, RECONNECT_TIMEOUT);
  public_ws.onerror = (error) => console.error(error);
  public_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    onPublicEvent(tag, data);
  };
}

function reconnectPrivateWS() {
  console.log("reconnectPrivateWS");
  if (private_ws) private_ws.close();
  private = null;
  if (!state.token) return;
  private_ws = new WebSocket(PRIVATE_WS_URL);
  private_ws.onopen = (error) => {
    private_ws.send(JSON.stringify({ token: state.token }));
  };
  private_ws.onclose = () => setTimeout(reconnectPrivateWS, RECONNECT_TIMEOUT);
  private_ws.onerror = (error) => console.error(error);
  private_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    onPrivateEvent(tag, data);
  };
  (function ping() {
    if (private_ws.readyState === WebSocket.OPEN) {
      private_ws.send(JSON.stringify({ ping: true }));
    }
    setTimeout(ping, 1000);
  })();
}

function onPublicEvent(tag, data) {
  if (tag == "ticker#btcusdt") {
    state.ticker = data;
    state.history.push(data);
  }
}

function onPrivateEvent(tag, data) {
  console.log("onPrivateEvent", tag, data);
  if (tag == "update-score") {
    state.score = data.score;
  }
  if (tag == "bet-insert") {
    state.bets.push(data);
    // Truncate to the recent 8 bets
    if (state.bets.length > 8) state.bets.shift();
  }
  if (tag == "bet-resolve") {
    const newBets = [];
    for (const bet of state.bets) {
      if (bet.bet_id == data.bet_id) newBets.push(data);
      else newBets.push(bet);
    }
    state.bets = newBets;
  }
}

// # REST
async function restGet(path) {
  const response = await fetch(rest_base_url + path, {
    method: "GET",
    headers: { "auth-token": state.token },
  });
  return await response.json();
}

async function restPost(path, data) {
  const response = await fetch(rest_base_url + path, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "auth-token": state.token,
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

async function fetchHistory() {
  state.history = await restGet("/rest/history/btcusdt");
}

async function fetchBets() {
  if (!state.token) return;
  state.bets = await restGet("/rest/bets/btcusdt");
}

async function fetchScore() {
  if (!state.token) return;
  state.score = await restGet("/rest/score/btcusdt");
}

// # Render
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

(function render_loop() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 14 * devicePixelRatio + 'px "Roboto Mono", monospace';
  render(ctx, canvas.width, canvas.height, state);
  requestAnimationFrame(render_loop);
})();

// # Utils
function format_date(seconds) {
  return new Date(seconds * 1000).toJSON().replace(".000", "").replace("T", " ").replace("Z", "");
}
