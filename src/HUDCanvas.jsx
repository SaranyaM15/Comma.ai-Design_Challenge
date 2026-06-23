import { useEffect, useRef } from 'react';



function lerp(a, b, t) { return a + (b - a) * t; }

export default function HUDCanvas({ confidence, steeringLoad }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ conf: confidence, time: 0, particles: [], images: {} });
  const rafRef = useRef(null);

  // Preload images
  useEffect(() => {
    const imgs = {};
    const load = (key, src) => new Promise(res => {
      const img = new Image();
      img.onload = () => { imgs[key] = img; res(); };
      img.src = src;
    });
    Promise.all([
      load('clear', roadClear),
      load('intersection', roadIntersection),
    ]).then(() => { stateRef.current.images = imgs; });
  }, []);

  // Init fog particles
  useEffect(() => {
    stateRef.current.particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 40 + Math.random() * 90,
      spd: 0.00010 + Math.random() * 0.00018,
      off: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      state.time += 0.016;
      state.conf = lerp(state.conf, confidence, 0.04);
      const conf = state.conf / 100;
      const fog = 1 - conf;
      const strT = steeringLoad / 100;

      ctx.clearRect(0, 0, W, H);

      // ── REAL PHOTO BACKGROUND ──
      const imgs = state.images;
      // Use intersection photo when confidence is low, clear road when high
      const bgImg = conf < 0.4 && imgs.intersection ? imgs.intersection : imgs.clear;

      if (bgImg) {
        // Draw photo covering full canvas, cropped to center
        const imgRatio = bgImg.width / bgImg.height;
        const canvasRatio = W / H;
        let sx, sy, sw, sh;
        if (imgRatio > canvasRatio) {
          sh = bgImg.height;
          sw = sh * canvasRatio;
          sx = (bgImg.width - sw) / 2;
          sy = 0;
        } else {
          sw = bgImg.width;
          sh = sw / canvasRatio;
          sx = 0;
          sy = (bgImg.height - sh) / 2.5; // slightly above center to show road
        }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);

        // Subtle darkening overlay to make UI elements pop
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, W, H);
      } else {
        // Fallback if images not loaded yet
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);
      }

      // ── GREEN PATH LINE (openpilot style) ──
      const vx = W * 0.5, vy = H * 0.52;
      const reach = 0.1 + conf * 0.82;
      const pathTopY = H - (H - vy) * reach;
      const pathW = W * 0.10;
      const topW = pathW * (1 - reach) * 0.5 + 1.5;
      const pathA = 0.18 + conf * 0.72;
      const dashOn = 3 + conf * 18;
      const dashOff = conf > 0.5 ? 0 : 5 + (1 - conf) * 20;

      ctx.save();
      // fill
      ctx.globalAlpha = pathA * 0.18;
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.moveTo(vx - pathW / 2, H);
      ctx.lineTo(vx + pathW / 2, H);
      ctx.lineTo(vx + topW / 2, pathTopY);
      ctx.lineTo(vx - topW / 2, pathTopY);
      ctx.closePath();
      ctx.fill();
      // center line
      ctx.globalAlpha = pathA;
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 1.5 + conf * 2.5;
      if (dashOff > 0) ctx.setLineDash([dashOn, dashOff]);
      else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(vx, H); ctx.lineTo(vx, pathTopY); ctx.stroke();
      // edges
      ctx.globalAlpha = pathA * 0.4;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(vx - pathW / 2, H); ctx.lineTo(vx - topW / 2, pathTopY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vx + pathW / 2, H); ctx.lineTo(vx + topW / 2, pathTopY); ctx.stroke();
      ctx.restore();

      // ── FOG OVERLAY ──
      if (fog > 0.02) {
        const fa = Math.min(fog * 0.94, 0.94);

        // Base fog layer
        const fogBase = ctx.createLinearGradient(0, 0, 0, H);
        fogBase.addColorStop(0, `rgba(185,192,200,${fa * 0.15})`);
        fogBase.addColorStop(0.35, `rgba(188,194,202,${fa * 0.45})`);
        fogBase.addColorStop(1, `rgba(195,200,208,${fa * 0.88})`);
        ctx.fillStyle = fogBase;
        ctx.fillRect(0, 0, W, H);

        // Animated fog wisps
        ctx.save();
        state.particles.forEach(p => {
          const x = ((p.x + state.time * p.spd) % 1.2 - 0.1) * W;
          const y = p.y * H;
          const pulse = 0.5 + 0.5 * Math.sin(state.time * 0.38 + p.off);
          const alpha = fog * 0.18 * pulse;
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * (0.5 + fog * 0.5));
          g.addColorStop(0, `rgba(200,206,212,${alpha})`);
          g.addColorStop(1, 'rgba(200,206,212,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, p.r * (0.5 + fog * 0.5), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // Vignette closing in from edges
        const vig = ctx.createRadialGradient(
          W / 2, H / 2, H * lerp(0.85, 0.04, fog),
          W / 2, H / 2, H * lerp(1.3, 0.5, fog)
        );
        vig.addColorStop(0, 'rgba(188,194,202,0)');
        vig.addColorStop(1, `rgba(190,196,205,${fog * 0.72})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }

      // ── ENGAGEMENT BORDER ──
      const borderCol = conf > 0.65 ? '#00c853' : conf > 0.3 ? '#e8a020' : '#d63030';
      const bw = Math.round(H * 0.022);
      ctx.save();
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = bw;
      ctx.globalAlpha = 0.95;
      ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
      ctx.restore();

      // ── SPEED (top left) ──
      const speedSize = Math.round(H * 0.24);
      ctx.save();
      ctx.globalAlpha = lerp(0.45, 1, conf);
      // Drop shadow for readability over photo
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = fog > 0.65 ? '#2a2a2a' : '#fff';
      ctx.font = `700 ${speedSize}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('62', W * 0.045, H * 0.31);
      ctx.font = `400 ${Math.round(H * 0.09)}px Arial, sans-serif`;
      ctx.fillStyle = fog > 0.65 ? '#555' : 'rgba(255,255,255,0.7)';
      ctx.fillText('mph', W * 0.052, H * 0.42);
      ctx.restore();

      // Set speed box (top left corner)
      ctx.save();
      ctx.globalAlpha = lerp(0.3, 0.78, conf);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const bbw = W * 0.1, bbh = H * 0.18, bbx = W * 0.028, bby = H * 0.05;
      ctx.beginPath();
      ctx.roundRect(bbx, bby, bbbw = bbw, bbbh = bbh, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `500 ${Math.round(H * 0.09)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('65', bbx + bbw / 2, bby + H * 0.115);
      ctx.font = `400 ${Math.round(H * 0.065)}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('set', bbx + bbw / 2, bby + H * 0.158);
      ctx.restore();

      // ── STEERING WHEEL ICON (top right) ──
      const wx = W * 0.88, wy = H * 0.22, wr = H * 0.1;
      const wCol = strT > 0.8 ? '#d63030' : strT > 0.5 ? '#e8a020' : 'rgba(255,255,255,0.8)';
      ctx.save();
      ctx.globalAlpha = lerp(0.4, 0.92, conf);
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      if (strT > 0.4) {
        ctx.shadowColor = strT > 0.75 ? '#d63030' : '#e8a020';
        ctx.shadowBlur = 12 * ((strT - 0.4) / 0.6);
      }
      ctx.strokeStyle = wCol;
      ctx.lineWidth = wr * 0.2;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = wr * 0.12;
      [[0, -1], [0.866, 0.5], [-0.866, 0.5]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + dx * wr * 0.72, wy + dy * wr * 0.72); ctx.stroke();
      });
      ctx.fillStyle = wCol;
      ctx.beginPath(); ctx.arc(wx, wy, wr * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Steering load label
      ctx.save();
      ctx.globalAlpha = lerp(0.3, 0.7, conf);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = strT > 0.75 ? '#d63030' : strT > 0.45 ? '#e8a020' : '#ccc';
      ctx.font = `400 ${Math.round(H * 0.07)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(steeringLoad)}% load`, wx, wy + wr + H * 0.1);
      ctx.restore();

      // ── DM EYE ICON ──
      const ex = W * 0.88, ey = H * 0.5, ew = W * 0.046, eh = H * 0.054;
      ctx.save();
      ctx.globalAlpha = lerp(0.25, 0.65, conf);
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 5;
      ctx.strokeStyle = conf > 0.5 ? '#00c853' : '#e8a020';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = conf > 0.5 ? '#00c853' : '#e8a020';
      ctx.beginPath(); ctx.arc(ex, ey, ew * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // ── ALERT BAR (bottom) ──
      const msg = conf > 0.65
        ? 'System driving — all clear'
        : conf > 0.3
        ? 'Getting hazy — stay alert'
        : 'Heavy fog — please take the wheel';
      const alertBg = conf > 0.65
        ? 'rgba(0,80,30,0.82)'
        : conf > 0.3
        ? 'rgba(110,60,0,0.85)'
        : 'rgba(90,15,15,0.88)';
      const alertText = conf > 0.65 ? '#00e676' : conf > 0.3 ? '#ffb74d' : '#ff5252';
      const barH = H * 0.16;
      ctx.save();
      ctx.fillStyle = alertBg;
      ctx.fillRect(0, H - barH, W, barH);
      ctx.font = `500 ${Math.round(H * 0.082)}px Arial, sans-serif`;
      ctx.fillStyle = alertText;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(msg, W / 2, H - barH + barH * 0.65);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [confidence, steeringLoad]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
