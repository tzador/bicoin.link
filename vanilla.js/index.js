const TOKEN = "auth_token";
const ws_base_url = location.protocol.replace("http", "ws") + "//" + location.host;
const public_ws_url = ws_base_url + "/ws/public";
const private_ws_url = ws_base_url + "/ws/private";
const binance_ws_url = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade";
const rest_base_url = "";
const reconnect_timeout_ms = 1000;

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
  recoonectPrivateWS();
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
  recoonectPrivateWS();
  fetchBets();
  fetchScore();
}

function logout() {
  state.token = null;
  state.bets = [];
  localStorage.removeItem(TOKEN);
  recoonectPrivateWS();
}

function minusOne() {
  restPost("/rest/score/btcusdt", { diff: -1 });
}

function reset() {
  restPost("/rest/score/btcusdt", { reset: true });
}

function plusOne() {
  restPost("/rest/score/btcusdt", { diff: +1 });
}

async function place_bet(is_up) {
  state.bets.unshift(await restPost("/rest/bets/btcusdt", { is_up }));
}

// # Mirror
{
  const ticker_el = document.getElementById("ticker");
  const login_el = document.getElementById("login");
  const logout_el = document.getElementById("logout");
  const buttons_el = document.getElementById("buttons");
  const the_score_el = document.getElementById("the-score");
  const score_cheat_el = document.getElementById("score-cheat");
  let last_auth_token = -1;
  let last_ticker_seconds = -1;
  let last_score = null;

  (function mirror() {
    if (last_auth_token != state.token) {
      last_auth_token = state.token;
      if (state.token) {
        login_el.style.display = "none";
        logout_el.style.display = "block";
        logout_el.innerText = "Logout @" + state.token;
        buttons_el.style.display = "flex";
        the_score_el.style.display = "block";
        score_cheat_el.style.display = "flex";
      } else {
        login_el.style.display = "block";
        logout_el.style.display = "none";
        logout_el.style.innerText = "";
        buttons_el.style.display = "none";
        the_score_el.style.display = "none";
        score_cheat_el.style.display = "none";
      }
    }

    if (last_score == null || last_score != state.score) {
      the_score_el.innerText = state.score.toString();
      last_score = state.score;
    }

    if (last_ticker_seconds != state.ticker.seconds) {
      last_ticker_seconds = state.ticker.seconds;
      const date = format_date(state.ticker.seconds);
      let price_str = state.ticker.price.toFixed(3).toString();
      while (price_str.length < 9) price_str = price_str + "0";
      const ticker_value = `${date} 1BTC=<span style="color: white">${price_str}</span>USDT`;
      ticker_el.innerHTML = ticker_value;
    }

    requestAnimationFrame(mirror);
  })();
}

// # WebSocket
function reconnectPublicWS() {
  if (public_ws) public_ws.close();
  public_ws = new WebSocket(public_ws_url);
  // public_ws.onclose = () =>
  //   setTimeout(reconnectPublicWS, reconnect_timeout_ms);
  public_ws.onerror = (error) => {
    console.error(error.message);
    // setTimeout(reconnectPublicWS, reconnect_timeout_ms);
  };
  public_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    onPublicEvent(tag, data);
  };
}

function recoonectPrivateWS() {
  if (private_ws) private_ws.close();
  private = null;
  if (!state.token) return;
  private_ws = new WebSocket(private_ws_url);
  private_ws.onopen = (error) => {
    private_ws.send(JSON.stringify({ token: state.token }));
  };
  // private_ws.onclose = () =>
  //   setTimeout(recoonectPrivateWS, reconnect_timeout_ms);
  private_ws.onerror = (error) => {
    console.error(error.message);
    // setTimeout(recoonectPrivateWS, reconnect_timeout_ms);
  };
  private_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    onPrivateEvent(tag, data);
  };
}

function onPublicEvent(tag, data) {
  if (tag == "ticker#btcusdt") {
    state.ticker = data;
    state.history.push(data);
    update_favicon();
  }
}

function onPrivateEvent(tag, data) {
  if (tag == "update-score") {
    state.score = data.score;
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
  console.log("fetch score");
  state.score = await restGet("/rest/score/btcusdt");
  console.log("fetch score res", state.score);
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
