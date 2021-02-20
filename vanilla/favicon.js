{
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const favicon = document.getElementById("favicon");
  canvas.width = 64;
  canvas.height = 64;
  img.src = "favicon.png";
  window.update_favicon = () => {
    ctx.save();
    ctx.clearRect(0, 0, 64, 64);
    ctx.translate(32, 32);
    ctx.rotate(-performance.now() / 1000.0);
    ctx.drawImage(img, 0, 0, img.width, img.height, -32, -32, 64, 64);
    const base64 = canvas.toDataURL("image/png");
    favicon.href = base64;
    ctx.restore();
  };
}
