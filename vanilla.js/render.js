const speed_x = 8;
let shift_x = 264;
let bets_width = 274;

let price_min = Number.MAX_VALUE;
let price_max = Number.MIN_VALUE;
let seconds_now = Date.now() / 1000.0;
let width = 0;
let height = 0;
let dpi = 1;
let anim_price = 0;

function render(ctx, w, h, state) {
  width = w;
  height = h;
  dpi = devicePixelRatio;
  seconds_now = Date.now() / 1000.0;
  if (state.history.length > 0) {
    anim_price = 0.9 * anim_price + 0.1 * state.history[state.history.length - 1].price;
  }
  render_init(state.history);
  render_history(ctx, state.history, anim_price);
  render_bets(ctx, state.bets);
  render_zebra(ctx, state.history);
}

function render_init(history) {
  dpi = devicePixelRatio;
  price_min = Number.MAX_VALUE;
  price_max = Number.MIN_VALUE;
  for (const { price } of history) {
    price_min = Math.min(price, price_min);
    price_max = Math.max(price, price_max);
  }
  if (window.innerWidth < 720) {
    shift_x = 80;
    bets_width = 274;
  } else {
    shift_x = 274;
    bets_width = 274;
  }
  console.log(bets_width);
}

function render_zebra(ctx, history) {
  let ztime = Math.floor(seconds_now) + 60 * 10;
  ctx.save();
  while (true) {
    const x0 = seconds_to_x(ztime - 1);
    const y0 = 0;
    const x1 = seconds_to_x(ztime);
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
  const zero_x = seconds_to_x(seconds_now);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(zero_x, 0, zero_x + width, height);
  ctx.restore();
}

function render_history(ctx, history, current_price) {
  if (history.length == 0) return;
  ctx.save();
  ctx.beginPath();
  let first_time = true;
  let last_x = 0;
  let last_y = 0;
  let first_x = 0;
  let first_y = 0;
  let i = 0;
  for (const { seconds, price } of history) {
    let x = seconds_to_x(seconds);
    let y = price_to_y(price);
    if (i++ == history.length - 1) {
      y = price_to_y(anim_price);
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
  const zero_x = seconds_to_x(seconds_now);
  if (anim_price) ctx.lineTo(zero_x, last_y);
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

function render_bets(ctx, bets) {
  // {
  //   ctx.save();
  //   for (const bet of bets) {
  //     const x = seconds_to_x(bet.seconds);
  //     const y = price_to_y(bet.open_price);
  //     const w = speed_x * 60;
  //     if (bet.is_up) {
  //       ctx.fillStyle = "rgba(0, 255, 0, 0.25)";
  //       ctx.fillRect(x, 0, w, y);
  //     } else {
  //       ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
  //       ctx.fillRect(x, y, w, height - y);
  //     }
  //   }
  //   ctx.restore();
  // }
  {
    ctx.save();
    for (const bet of bets) {
      const x0 = seconds_to_x(bet.seconds);
      const y0 = price_to_y(bet.open_price);
      const x1 = seconds_to_x(bet.seconds + 60);
      const y1 = price_to_y(bet.close_price || anim_price);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      if (bet.is_up) ctx.strokeStyle = "rgba(0, 255, 0, 1)";
      else ctx.strokeStyle = "rgba(255, 0, 0, 1)";
      ctx.lineCap = "round";
      ctx.lineWidth = 4 * dpi;
      ctx.stroke();
    }
    ctx.restore();
  }
  {
    ctx.save();
    let y = 48 * dpi;
    for (const bet of bets) {
      const diff = Math.floor(seconds_now - bet.seconds);
      const capped = Math.max(0, Math.min(60, diff));
      ctx.save();
      ctx.translate(8 * dpi, 8 * dpi);
      if (bet.is_up) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.25)";
      } else {
        ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
      }
      ctx.fillRect(0, y, bets_width * dpi, 32 * dpi);
      if (bet.is_up) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
      } else {
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      }
      ctx.fillRect(0, y, (1 - capped / 60) * bets_width * dpi, 32 * dpi);
      ctx.fillStyle = "white";
      const text = format_date(bet.seconds);
      ctx.fillText(text, 8 * dpi, y + 22 * dpi);
      ctx.fillText("loose :(", 200 * dpi, y + 22 * dpi);
      ctx.restore();
      y += 40 * dpi;
    }
    ctx.restore();
  }
}

function seconds_to_x(seconds) {
  return width - (seconds_now - seconds) * speed_x - shift_x * devicePixelRatio;
}

function price_to_y(price) {
  return height - 2 * 48 * dpi - (height - 4 * 48 * dpi) * ((price - price_min) / (price_max - price_min));
}
