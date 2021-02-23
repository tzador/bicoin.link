const speed_x = 8;
const bets_width = 260;
let shift_x = 0;

let price_min = Number.MAX_VALUE;
let price_max = Number.MIN_VALUE;
let secondsNow = Date.now() / 1000.0;
let width = 0;
let height = 0;
let dpi = 1;
let animPrice = 0;

function render(ctx, w, h, state) {
  width = w;
  height = h;
  dpi = devicePixelRatio;
  secondsNow = Date.now() / 1000.0;
  if (state.history.length > 0) {
    // animPrice = 0.9 * animPrice + 0.1 * state.history[state.history.length - 1].price;
    animPrice = state.history[state.history.length - 1].price;
  }
  renderInit(state.history);
  renderZebra(ctx, state.history);
  renderHistory(ctx, state.history, state.ticker.price);
  renderLabels(ctx);
  renderBets(ctx, state.bets);
}

function renderInit(history) {
  dpi = devicePixelRatio;
  price_min = Number.MAX_VALUE;
  price_max = Number.MIN_VALUE;
  for (const { price } of history) {
    price_min = Math.min(price, price_min);
    price_max = Math.max(price, price_max);
  }
  if (window.innerWidth < 720) {
    shift_x = 80;
  } else {
    shift_x = 274;
  }
}

function renderZebra(ctx, history) {
  let ztime = Math.floor(secondsNow) + 60 * 10;
  ctx.save();
  while (true) {
    const x0 = secondsToX(ztime - 1);
    const y0 = 0;
    const x1 = secondsToX(ztime);
    const y1 = height;
    if (Math.floor(ztime) % 2 == 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.0)";
    }
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ztime -= 1;
    if (x0 < 0) break;
  }
  const zero_x = secondsToX(secondsNow);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(zero_x, 0, zero_x + width, height);
  ctx.restore();
}

function renderHistory(ctx, history, current_price) {
  if (history.length == 0 || current_price == 0) return;
  ctx.save();
  ctx.beginPath();
  let first_time = true;
  let last_x = 0;
  let last_y = 0;
  let first_x = 0;
  let first_y = 0;
  let i = 0;
  for (const { seconds, price } of history) {
    let x = secondsToX(seconds);
    let y = priceToY(price);
    if (i++ == history.length - 1) {
      y = priceToY(animPrice);
    }
    last_x = x;
    last_y = y;
    if (first_time) {
      ctx.moveTo(x, y);
      first_time = false;
      first_x = x;
      first_y = y;
    }
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, last_y);
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 2 * dpi;
  const zero_x = secondsToX(secondsNow);
  if (animPrice) ctx.lineTo(zero_x, last_y);
  ctx.stroke();

  ctx.lineTo(zero_x, height);
  ctx.lineTo(first_x, height);
  ctx.closePath();
  ctx.clip();
  var gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255, 255, 0, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderLabels() {
  // Vertical time indicators
  {
    const w = secondsToX(60) - secondsToX(0);
    let seconds = Math.ceil(secondsNow / 60) * 60;
    for (let i = 0; i < 8; i++) {
      ctx.save();

      // Draw the vertical time lines
      ctx.translate(secondsToX(seconds), 0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.setLineDash([dpi * 8, dpi * 8]);
      ctx.lineWidth = 2 * dpi;
      ctx.stroke();

      // Draw the vertical time labels
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      const text = new Date(seconds * 1000).toJSON().split("T")[1].split(".")[0];
      ctx.fillText(text, 8 * dpi, height - 56 * dpi);

      ctx.restore();
      seconds -= 60;
    }
  }

  // Horizontal price indicators
  {
    const h = priceToY(10) - priceToY(0);
    let price = Math.ceil(animPrice / 100 - 10) * 100;
    for (let i = 0; i < 20; i++) {
      ctx.save();

      // Draw the horizontal price lines
      ctx.translate(0, priceToY(price));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.setLineDash([dpi * 8, dpi * 8]);
      ctx.lineWidth = 2 * dpi;
      ctx.stroke();

      // Draw the horizontal price labels
      ctx.translate(secondsToX(secondsNow), 0);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      const text = price.toFixed(3);
      ctx.fillText(text, 8 * dpi, -8 * dpi);

      ctx.restore();
      price += 100;
    }
  }

  // Horizontal current price indicator
  {
    ctx.save();
    ctx.translate(secondsToX(secondsNow), priceToY(animPrice));
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, -52, width, 50);
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    const text = animPrice.toFixed(3);
    ctx.fillText(text, 8 * dpi, -8 * dpi);
    ctx.restore();
  }
}

function renderBets(ctx, bets) {
  // Renders the bets on the Chart
  {
    for (const bet of bets) {
      ctx.save();
      const x0 = secondsToX(bet.open_seconds);
      const y0 = priceToY(bet.open_price);
      const x1 = secondsToX(bet.open_seconds + 60);
      const y1 = priceToY(bet.close_price || animPrice);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      if (bet.is_up) ctx.strokeStyle = "rgba(0, 255, 0, 1)";
      else ctx.strokeStyle = "rgba(255, 0, 0, 1)";
      ctx.lineCap = "round";
      ctx.lineWidth = 4 * dpi;
      if (bet.win === null) {
        ctx.globalAlpha = (Math.sin(Date.now() / 100) + 1) / 2.0;
      }
      let isGood = false;
      if (bet.win === null) {
        isGood = (bet.is_up && bet.open_price < animPrice) || (!bet.is_up && bet.open_price > animPrice);
      } else {
        isGood = (bet.is_up && bet.open_price < bet.close_price) || (!bet.is_up && bet.open_price > bet.close_price);
      }
      if (!isGood) {
        ctx.setLineDash([dpi * 8, dpi * 8]);
      }

      ctx.stroke();
      ctx.restore();
    }
  }

  // Renders the Bets Table
  {
    ctx.save();
    ctx.font = 12 * dpi + 'px "Roboto Mono", monospace';
    let y = 64 * dpi;
    for (const bet of bets) {
      const diff = Math.floor(secondsNow - bet.open_seconds);
      const capped = Math.max(0, Math.min(60, diff));
      ctx.save();
      ctx.translate(8 * dpi, 8 * dpi);
      if (bet.is_up) {
        ctx.fillStyle = "rgba(0, 127, 0, 0.9)";
      } else {
        ctx.fillStyle = "rgba(127, 0, 0, 0.9)";
      }
      ctx.fillRect(0, y, bets_width * dpi, 32 * dpi);
      if (bet.is_up) {
        ctx.fillStyle = "rgba(0, 255, 0, 1)";
      } else {
        ctx.fillStyle = "rgba(255, 0, 0, 1)";
      }
      ctx.fillRect(0, y, (1 - capped / 60) * bets_width * dpi, 32 * dpi);
      ctx.fillStyle = "white";
      const text_open = format_date(bet.open_seconds);
      ctx.fillText(text_open, 8 * dpi, y + 22 * dpi);
      const close_seconds = bet.close_seconds || secondsNow;
      const text_close = "-" + format_date(close_seconds).split(" ")[1].split(".")[0];
      ctx.fillText(text_close, 146 * dpi, y + 22 * dpi);

      let winText = "";
      if (bet.win === true) winText = "win";
      if (bet.win === false) winText = "lost";
      ctx.fillText(winText, 216 * dpi, y + 22 * dpi);
      ctx.restore();
      y += 40 * dpi;
    }
    ctx.restore();
  }
}

// Time in seconds to x pixel coordinates
function secondsToX(seconds) {
  return width - (secondsNow - seconds) * speed_x - shift_x * dpi;
}

// Price in USDT to y pixel coordinates
function priceToY(price) {
  return height - 2 * 48 * dpi - (height - 4 * 48 * dpi) * ((price - price_min) / (price_max - price_min));
}
