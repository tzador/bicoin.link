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
};
let public_ws = null;
let private_ws = null;

(function boot() {
  reconnect_public_ws();
  reconnect_private_ws();
  fetch_history();
  fetch_bets();
})();

// # UI Actions
function login() {
  state.token = prompt("Enter a nickname:") || null;
  if (state.token) {
    state.token = state.token.trim();
    localStorage.setItem(TOKEN, state.token);
  } else localStorage.removeItem(TOKEN);
  reconnect_private_ws();
  fetch_bets();
}

function logout() {
  state.token = null;
  state.bets = [];
  localStorage.removeItem(TOKEN);
  reconnect_private_ws();
}

async function place_bet(is_up) {
  state.bets.unshift(await restPost("/rest/bets/btcusdt", { is_up }));
}

// # Mirror
{
  const ticker_el = document.getElementById("ticker");
  const login_el = document.getElementById("login");
  const logout_el = document.getElementById("logout");
  const reset_el = document.getElementById("reset");
  const buttons_el = document.getElementById("buttons");
  let last_auth_token = -1;
  let last_ticker_seconds = -1;

  (function mirror() {
    if (last_auth_token != state.token) {
      last_auth_token = state.token;
      if (state.token) {
        login_el.style.display = "none";
        logout_el.style.display = "block";
        logout_el.innerText = "Logout @" + state.token;
        reset_el.style.display = "block";
        buttons_el.style.display = "flex";
      } else {
        login_el.style.display = "block";
        logout_el.style.display = "none";
        logout_el.style.innerText = "";
        reset_el.style.display = "none";
        buttons_el.style.display = "none";
      }
    }
    if (last_ticker_seconds != state.ticker.seconds) {
      last_ticker_seconds = state.ticker.seconds;
      const date = format_date(state.ticker.seconds);
      let price_str = state.ticker.price.toFixed(3).toString();
      while (price_str.length < 9) price_str = price_str + "0";
      const ticker_value = `${date} &nbsp; 1 BTC = <span style="color: white">${price_str}</span> USDT`;
      ticker_el.innerHTML = ticker_value;
    }
    requestAnimationFrame(mirror);
  })();
}

// # WebSocket
function reconnect_public_ws() {
  if (public_ws) public_ws.close();
  public_ws = new WebSocket(public_ws_url);
  // public_ws.onclose = () =>
  //   setTimeout(reconnect_public_ws, reconnect_timeout_ms);
  public_ws.onerror = (error) => {
    console.error(error.message);
    // setTimeout(reconnect_public_ws, reconnect_timeout_ms);
  };
  public_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    on_public(tag, data);
  };
}

function reconnect_private_ws() {
  if (private_ws) private_ws.close();
  private = null;
  if (!state.token) return;
  private_ws = new WebSocket(private_ws_url);
  private_ws.onopen = (error) => {
    private_ws.send(JSON.stringify({ token: state.token }));
  };
  // private_ws.onclose = () =>
  //   setTimeout(reconnect_private_ws, reconnect_timeout_ms);
  private_ws.onerror = (error) => {
    console.error(error.message);
    // setTimeout(reconnect_private_ws, reconnect_timeout_ms);
  };
  private_ws.onmessage = (message) => {
    const { tag, data } = JSON.parse(message.data);
    on_private(tag, data);
  };
}

function on_public(tag, data) {
  if (tag == "ticker#btcusdt") {
    state.ticker = data;
    state.history.push(data);
    update_favicon();
  }
}

function on_private(tag, data) {
  console.log("on_private", tag, data);
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

async function fetch_history() {
  state.history = await restGet("/rest/history/btcusdt");
}

async function fetch_bets() {
  if (!state.token) return;
  state.bets = await restGet("/rest/bets/");
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
