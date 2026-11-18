/* ==========================================================================
   FIVE MACHINES — the descent engine
   Scroll position drives: the station tint, the spine bead, which beat is
   live, and a 0..1 progress value handed to each station's figure.
   No libraries. Everything degrades to a static final frame.
   ========================================================================== */

(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const ease  = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const seg   = (t, a, b) => clamp((t - a) / (b - a));   // sub-progress within a span

  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  /* ---------------------------------------------------------------- tint */

  function tint(color) {
    const [r, g, b] = hex(color);
    const s = document.documentElement.style;
    s.setProperty("--accent", color);
    s.setProperty("--accent-soft", `rgba(${r},${g},${b},.14)`);
    s.setProperty("--glow", `rgba(${r},${g},${b},.34)`);
  }

  /* ----------------------------------------------------------- the spine */

  function spine() {
    const bead = $("[data-bead]");
    if (!bead) return;
    const move = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? clamp(scrollY / h) : 0;
      bead.style.top = (p * 100).toFixed(2) + "%";
    };
    addEventListener("scroll", move, { passive: true });
    addEventListener("resize", move);
    move();
  }

  /* --------------------------------------------------------- the figures */
  /* Each renderer gets (ctx, t, W, H, accent) where t runs 0..1 across the
     station's four beats. They are pure: same t, same frame.              */

  const FIG = {};

  // The canvas is authored at 900px wide and displayed smaller, so every
  // label is drawn oversized to survive the downscale.
  const FS = 1.32;

  const mono = (ctx, s, x, y, size = 11, col = "#67768a", align = "left") => {
    ctx.font = `${(size * FS).toFixed(1)}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = col;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
    ctx.textAlign = "left";
  };

  const rr = (ctx, x, y, w, h, r = 3) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const grid = (ctx, W, H) => {
    ctx.strokeStyle = "#141b24";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  };

  /* ---- 01 · aegis: vessel, envelope, relay ---- */

  FIG.aegis = (ctx, t, W, H, ac) => {
    grid(ctx, W, H);

    const b1 = seg(t, .27, .47);   // beat 2 — command raises temperature
    const b2 = seg(t, .52, .72);   // beat 3 — approach the curve
    const b3 = seg(t, .77, .95);   // beat 4 — trip
    const tripped = t >= .76;

    const temp = lerp(62, 158, ease(Math.max(b1, b2)));
    const pres = lerp(3.6, 9.4, ease(b2));

    /* ---- vessel, left ---- */
    const vx = 70, vy = 150, vw = 250, vh = 330;
    ctx.strokeStyle = tripped ? "#ef5f54" : "#2a3644";
    ctx.lineWidth = 2;
    rr(ctx, vx, vy, vw, vh, 26);
    ctx.stroke();

    // contents
    const fill = vy + vh - 120;
    ctx.save();
    rr(ctx, vx + 3, vy + 3, vw - 6, vh - 6, 24);
    ctx.clip();
    const g = ctx.createLinearGradient(0, fill, 0, vy + vh);
    const heat = clamp((temp - 60) / 110);
    g.addColorStop(0, `rgba(${lerp(60, 239, heat) | 0},${lerp(110, 95, heat) | 0},${lerp(130, 84, heat) | 0},.30)`);
    g.addColorStop(1, "rgba(10,14,20,.1)");
    ctx.fillStyle = g;
    ctx.fillRect(vx, fill, vw, vh);

    // convection marks rising with heat
    ctx.strokeStyle = `rgba(${lerp(80, 239, heat) | 0},${lerp(140, 110, heat) | 0},${lerp(160, 90, heat) | 0},${.22 + heat * .5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = vx + 34 + i * 30;
      const amp = 6 + heat * 13;
      ctx.beginPath();
      for (let y = 0; y < 110; y++) {
        const yy = fill - y + 14;
        ctx.lineTo(x + Math.sin((y / 15) + i * 1.7 + t * 9) * amp * (y / 110), yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    mono(ctx, "VESSEL 01", vx, vy - 16, 11, "#44515f");
    mono(ctx, temp.toFixed(0) + " °C", vx + vw, vy - 16, 13, tripped ? "#ef5f54" : ac, "right");
    mono(ctx, pres.toFixed(1) + " bar", vx + vw, vy + vh + 26, 13, tripped ? "#ef5f54" : "#9fadbd", "right");
    mono(ctx, "PROCESS STATE", vx, vy + vh + 26, 11, "#44515f");

    /* ---- bus + command packet ---- */
    const busY = 96;
    ctx.strokeStyle = "#2a3644";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(vx, busY); ctx.lineTo(W - 60, busY); ctx.stroke();
    mono(ctx, "FIELDBUS", vx, busY - 14, 10, "#44515f");

    if (t > .18) {
      const p = (t * 2.6) % 1;
      const px = lerp(W - 60, vx + 120, p);
      ctx.fillStyle = tripped ? "#ef5f54" : ac;
      ctx.fillRect(px - 10, busY - 3, 20, 6);
      if (t < .5) mono(ctx, "SETPOINT +", px, busY - 14, 10, ac, "center");
    }

    /* ---- envelope plot, right ---- */
    const px0 = 420, py0 = 150, pw = W - 480, ph = 300;
    const X = v => px0 + ((v - 20) / 170) * pw;
    const Y = v => py0 + ph - (v / 12) * ph;
    const pMax = v => clamp(11.2 - .0475 * (v - 20), 0, 12);

    ctx.strokeStyle = "#2a3644";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py0 + ph); ctx.lineTo(px0 + pw, py0 + ph); ctx.stroke();

    // the manifold
    const curveLit = clamp(b2 * 1.6);
    ctx.beginPath();
    for (let v = 20; v <= 168; v += 2) ctx.lineTo(X(v), Y(pMax(v)));
    ctx.lineTo(X(168), Y(0));
    ctx.strokeStyle = `rgba(111,207,143,${.25 + curveLit * .6})`;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(111,207,143,${.04 + curveLit * .05})`;
    ctx.lineTo(X(20), Y(0));
    ctx.closePath();
    ctx.fill();

    mono(ctx, "STABILITY MANIFOLD", px0 + 8, py0 + 18, 10, "#44515f");
    mono(ctx, "PRESSURE", px0 - 8, py0 + 10, 10, "#44515f", "right");
    mono(ctx, "TEMPERATURE", px0 + pw, py0 + ph + 20, 10, "#44515f", "right");

    // trail of the operating point
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const kk = k / 24;
      const tt = lerp(0, t, kk);
      const bb1 = seg(tt, .22, .48), bb2 = seg(tt, .48, .72);
      ctx.lineTo(X(lerp(62, 158, ease(Math.max(bb1, bb2)))), Y(lerp(3.6, 9.4, ease(bb2))));
    }
    ctx.strokeStyle = "rgba(159,173,189,.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ox = X(temp), oy = Y(pres);
    ctx.beginPath(); ctx.arc(ox, oy, tripped ? 7 : 5, 0, 7);
    ctx.fillStyle = tripped ? "#ef5f54" : ac;
    ctx.fill();
    if (tripped) {
      ctx.beginPath(); ctx.arc(ox, oy, 7 + (1 - b3) * 26, 0, 7);
      ctx.strokeStyle = `rgba(239,95,84,${b3 * .8})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    /* ---- relay + verdict ---- */
    const ry = py0 + ph + 70;
    mono(ctx, "ENFORCER · GPIO 25", px0, ry, 11, "#44515f");
    const rx = px0 + 2;
    ctx.strokeStyle = tripped ? "#ef5f54" : "#6fcf8f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 34); ctx.lineTo(rx + 36, ry + 34);
    ctx.moveTo(rx + 94, ry + 34); ctx.lineTo(rx + 130, ry + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx + 36, ry + 34);
    ctx.lineTo(rx + 94, ry + 34 - (tripped ? 26 * ease(clamp(b3 * 3)) : 0));
    ctx.stroke();
    ctx.beginPath(); ctx.arc(rx + 36, ry + 34, 3, 0, 7); ctx.arc(rx + 94, ry + 34, 3, 0, 7);
    ctx.fillStyle = tripped ? "#ef5f54" : "#6fcf8f";
    ctx.fill();

    mono(ctx, tripped ? "OPEN" : "CLOSED", rx + 150, ry + 38, 13, tripped ? "#ef5f54" : "#6fcf8f");

    if (tripped) {
      const ms = (12.74 * ease(clamp(b3 * 2.2))).toFixed(2);
      mono(ctx, ms + " ms", W - 60, ry + 38, 22, "#ef5f54", "right");
      mono(ctx, "DETECTION → PHYSICAL CUT", W - 60, ry + 16, 10, "#44515f", "right");
      if (b3 > .55) mono(ctx, "CLASSIFIER: stuxnet · T0836", W - 60, ry + 60, 11, ac, "right");
    }
  };

  /* ---- 02 · sentinel: plaza, boxes, tracks, the sprint ---- */

  const WALKERS = [
    { x: .12, y: .70, vx: .055, vy: -.004, id: 7 },
    { x: .74, y: .26, vx: -.038, vy: .018, id: 12 },
    { x: .38, y: .16, vx: .016, vy: .040, id: 19 },
    { x: .62, y: .80, vx: -.028, vy: -.030, id: 23 }
  ];

  FIG.sentinel = (ctx, t, W, H, ac) => {
    const pw = W, ph = 430;
    ctx.fillStyle = "#080b0f";
    ctx.fillRect(0, 0, pw, ph);
    grid(ctx, W, ph);

    const boxes  = seg(t, .27, .47);
    const tracks = seg(t, .52, .72);
    const sprint = seg(t, .77, .96);

    const clock = t * 3.1;

    WALKERS.forEach((w, i) => {
      const runner = w.id === 12;
      const boost = runner ? ease(sprint) * 1.9 : 0;
      const px = (w.x + w.vx * clock * (1 + boost * 2.4)) % 1.08;
      const py = (w.y + w.vy * clock) % 1.02;
      const x = (px < 0 ? px + 1 : px) * (pw - 90) + 45;
      const y = (py < 0 ? py + 1 : py) * (ph - 90) + 45;
      const hot = runner && sprint > .08;

      // trail
      if (tracks > 0) {
        ctx.beginPath();
        for (let k = 16; k >= 0; k--) {
          const kk = clock - k * .26;
          const bx = ((w.x + w.vx * kk * (1 + boost * 2.4)) % 1.08 + 1) % 1 * (pw - 90) + 45;
          const by = ((w.y + w.vy * kk) % 1.02 + 1) % 1 * (ph - 90) + 45;
          ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = hot ? `rgba(239,95,84,${tracks * .9})` : `rgba(159,173,189,${tracks * .5})`;
        ctx.lineWidth = hot ? 1.8 : 1.1;
        ctx.stroke();
      }

      // body
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7);
      ctx.fillStyle = hot ? "#ef5f54" : "#9fadbd";
      ctx.fill();

      // detection box
      if (boxes > 0) {
        ctx.strokeStyle = hot ? `rgba(239,95,84,${boxes})` : `rgba(${hexStr(ac)},${boxes * .7})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 15, y - 30, 30, 60);
        if (boxes > .5) mono(ctx, (0.82 + i * 0.03).toFixed(2), x - 15, y - 36, 9, hot ? "#ef5f54" : "#44515f");
      }
      if (tracks > .4) mono(ctx, "ID " + w.id, x + 20, y - 18, 10, hot ? "#ef5f54" : "#67768a");
    });

    mono(ctx, boxes > 0 ? "YOLOV8N · PERSON" : "RAW FRAME", 24, 30, 11, "#44515f");
    mono(ctx, tracks > .3 ? "DEEPSORT · 4 TRACKS HELD" : "", 24, 50, 11, "#44515f");

    /* ---- error trace below ---- */
    const ty = ph + 60, th = 120;
    ctx.strokeStyle = "#2a3644";
    ctx.beginPath(); ctx.moveTo(24, ty + th); ctx.lineTo(W - 24, ty + th); ctx.stroke();
    mono(ctx, "RECONSTRUCTION ERROR", 24, ty - 12, 11, "#44515f");

    const thr = ty + th - th * .42;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(242,163,60,.45)";
    ctx.beginPath(); ctx.moveTo(24, thr); ctx.lineTo(W - 24, thr); ctx.stroke();
    ctx.setLineDash([]);
    mono(ctx, "THRESHOLD 0.34", W - 24, thr - 8, 10, "#44515f", "right");

    ctx.beginPath();
    let peak = 0;
    for (let i = 0; i <= 260; i++) {
      const u = i / 260;
      const x = lerp(24, W - 24, u);
      let e = .12 + Math.sin(u * 22) * .015;
      if (u > .62) e += .62 * Math.sin(clamp((u - .62) / .3) * Math.PI) * ease(sprint);
      peak = Math.max(peak, e);
      ctx.lineTo(x, ty + th - (e / .9) * th);
    }
    ctx.strokeStyle = sprint > .3 ? "#ef5f54" : "#9fadbd";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    if (sprint > .35) {
      mono(ctx, "ANOMALY · running · track 12", W - 24, ty + 16, 12, "#ef5f54", "right");
      mono(ctx, "peak " + peak.toFixed(3), W - 24, ty + 36, 11, "#44515f", "right");
    }
  };

  const hexStr = h => hex(h).join(",");

  /* ---- 03 · forensics: the document, the edit, the sweep ---- */

  FIG.forensics = (ctx, t, W, H, ac) => {
    const dx = 150, dy = 60, dw = W - 300, dh = 500;

    const edited  = seg(t, .27, .47);
    const sweep   = seg(t, .52, .73);
    const verdict = seg(t, .78, .94);

    // paper
    ctx.fillStyle = "#f3f1ea";
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = "#2a3644";
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, dw, dh);

    ctx.fillStyle = "#1b1b1b";
    ctx.font = '600 20px "IBM Plex Sans", sans-serif';
    ctx.fillText("MERIDIAN LOGISTICS PVT LTD", dx + 36, dy + 56);
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#666";
    ctx.fillText("INVOICE  MR-2026-0418", dx + 36, dy + 86);
    ctx.fillText("ISSUED   18 NOV 2026", dx + 36, dy + 108);

    ctx.strokeStyle = "#c9c6bd";
    ctx.beginPath(); ctx.moveTo(dx + 36, dy + 132); ctx.lineTo(dx + dw - 36, dy + 132); ctx.stroke();

    const rows = [["Freight — Mangalore / Kochi", "41,200"], ["Handling", "6,800"], ["Insurance", "3,150"]];
    ctx.fillStyle = "#444";
    rows.forEach((r, i) => {
      ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.fillText(r[0], dx + 36, dy + 176 + i * 30);
      ctx.textAlign = "right";
      ctx.fillText(r[1], dx + dw - 36, dy + 176 + i * 30);
      ctx.textAlign = "left";
    });

    ctx.strokeStyle = "#c9c6bd";
    ctx.beginPath(); ctx.moveTo(dx + 36, dy + 300); ctx.lineTo(dx + dw - 36, dy + 300); ctx.stroke();

    ctx.fillStyle = "#1b1b1b";
    ctx.font = '600 16px "IBM Plex Sans", sans-serif';
    ctx.fillText("TOTAL PAYABLE", dx + 36, dy + 346);

    // the altered total
    const tot = dx + dw - 36;
    if (edited > 0) {
      ctx.fillStyle = "#f3f1ea";
      ctx.fillRect(tot - 190, dy + 322, 190, 34);
    }
    ctx.font = '600 24px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#1b1b1b";
    ctx.textAlign = "right";
    ctx.fillText(edited > .5 ? "91,150.00" : "51,150.00", tot, dy + 348);
    ctx.textAlign = "left";

    if (edited > 0 && edited < 1) {
      ctx.strokeStyle = ac;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tot - 190, dy + 322, 190, 34);
      mono(ctx, "PASTED · NEVER COMPRESSED", tot, dy + 314, 10, ac, "right");
    }

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#9b978d";
    ctx.fillText("scanned copy · retained for audit", dx + 36, dy + dh - 30);

    /* ---- ELA overlay revealed by a sweep ---- */
    if (sweep > 0) {
      const edge = dx + sweep * dw;
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, edge - dx, dh);
      ctx.clip();

      ctx.fillStyle = "#07090c";
      ctx.fillRect(dx, dy, dw, dh);

      // residual: faint everywhere text sits, loud on the edit
      const glow = (x, y, w, h, s) => {
        const g2 = ctx.createLinearGradient(x, y, x, y + h);
        g2.addColorStop(0, `rgba(${hexStr(ac)},0)`);
        g2.addColorStop(.5, `rgba(${hexStr(ac)},${s})`);
        g2.addColorStop(1, `rgba(${hexStr(ac)},0)`);
        ctx.fillStyle = g2;
        ctx.fillRect(x, y, w, h);
      };
      glow(dx + 36, dy + 40, 330, 24, .18);
      glow(dx + 36, dy + 74, 250, 18, .12);
      glow(dx + 36, dy + 96, 250, 18, .12);
      rows.forEach((r, i) => {
        glow(dx + 36, dy + 162 + i * 30, 280, 18, .13);
        glow(dx + dw - 150, dy + 162 + i * 30, 110, 18, .13);
      });
      glow(dx + 36, dy + 332, 180, 20, .16);
      // the edit, far brighter
      ctx.fillStyle = `rgba(255,255,255,${.1 + verdict * .08})`;
      ctx.fillRect(tot - 190, dy + 322, 190, 34);
      glow(tot - 190, dy + 318, 190, 42, .92);

      ctx.restore();

      ctx.strokeStyle = ac;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(edge, dy); ctx.lineTo(edge, dy + dh); ctx.stroke();
      mono(ctx, "ELA · q=95 · ×14", edge + 10, dy + 20, 11, ac);
    }

    mono(ctx, "DOCUMENT UNDER TEST", dx, dy - 18, 11, "#44515f");

    if (verdict > .2) {
      ctx.strokeStyle = "#ef5f54";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tot - 196, dy + 316, 202, 46);
      mono(ctx, "REGION INCONSISTENT · 7.88× PAGE", dx + dw / 2, dy + dh + 34, 13, "#ef5f54", "center");
    }
  };

  /* ---- 04 · risk: five agents, a priced incident ---- */

  const AGENTS = ["DETECTOR", "CLASSIFIER", "ISOLATOR", "QUANTIFIER", "REPORTER"];

  FIG.risk = (ctx, t, W, H, ac) => {
    grid(ctx, W, H);
    const y = 150, bw = 132, gap = (W - 120 - bw * 5) / 4;

    const flow = seg(t, .04, .23);
    const iso  = seg(t, .28, .47);
    const num  = seg(t, .52, .73);
    const fin  = seg(t, .77, .93);

    // pipes
    ctx.strokeStyle = "#2a3644";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y + 40); ctx.lineTo(W - 60, y + 40); ctx.stroke();

    AGENTS.forEach((name, i) => {
      const x = 60 + i * (bw + gap);
      const lit = clamp((flow * 5) - i);
      ctx.strokeStyle = lit > .5 ? ac : "#2a3644";
      ctx.lineWidth = lit > .5 ? 1.5 : 1;
      rr(ctx, x, y, bw, 80, 2);
      ctx.stroke();
      ctx.fillStyle = lit > .5 ? `rgba(${hexStr(ac)},.07)` : "transparent";
      ctx.fill();
      mono(ctx, "0" + (i + 1), x + 12, y + 26, 10, lit > .5 ? ac : "#44515f");
      mono(ctx, name, x + 12, y + 50, 11, lit > .5 ? "#eef2f6" : "#44515f");
    });

    // packet travelling
    if (flow > 0 && flow < 1) {
      const px = lerp(60, W - 60, flow);
      ctx.fillStyle = ac;
      ctx.fillRect(px - 9, y + 37, 18, 6);
    }

    mono(ctx, "MQTT TELEMETRY", 60, y - 24, 11, "#44515f");

    // isolation
    if (iso > 0) {
      const ix = 60 + 2 * (bw + gap) + bw / 2;
      ctx.strokeStyle = "#ef5f54";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ix, y + 80);
      ctx.lineTo(ix, y + 120);
      ctx.moveTo(ix - 22, y + 150); ctx.lineTo(ix + 22, y + 150);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ix, y + 120);
      ctx.lineTo(ix + 26 * ease(iso), y + 150);
      ctx.stroke();
      mono(ctx, "DEVICE ISOLATED", ix + 40, y + 154, 11, "#ef5f54");
    }

    // the money
    const lines = [
      ["DOWNTIME COST", 19200000],
      ["SLA PENALTY", 2880000],
      ["REGULATORY", 1500000]
    ];
    const ly = 330;
    lines.forEach((l, i) => {
      const k = clamp(num * 3 - i);
      ctx.strokeStyle = "#1f2834";
      ctx.beginPath(); ctx.moveTo(60, ly + i * 54 + 30); ctx.lineTo(W - 60, ly + i * 54 + 30); ctx.stroke();
      mono(ctx, l[0], 60, ly + i * 54 + 20, 11, "#44515f");
      ctx.font = '500 22px "IBM Plex Mono", monospace';
      ctx.fillStyle = k > 0 ? "#eef2f6" : "#1f2834";
      ctx.textAlign = "right";
      ctx.fillText("$" + Math.round(l[1] * ease(k)).toLocaleString("en-US"), W - 60, ly + i * 54 + 22);
      ctx.textAlign = "left";
    });

    const total = 23580000;
    mono(ctx, "TOTAL EXPOSURE", 60, ly + 192, 11, "#44515f");
    ctx.font = '600 38px "IBM Plex Mono", monospace';
    ctx.fillStyle = fin > 0 ? ac : "#1f2834";
    ctx.textAlign = "right";
    ctx.fillText("$" + Math.round(total * ease(clamp(num))).toLocaleString("en-US"), W - 60, ly + 200);
    ctx.textAlign = "left";

    if (fin > .3) {
      ctx.strokeStyle = "#ef5f54";
      ctx.lineWidth = 1.5;
      rr(ctx, 60, ly + 216, 190, 34, 2);
      ctx.stroke();
      mono(ctx, "CREDIT RISK: CRITICAL", 74, ly + 238, 12, "#ef5f54");
    }
  };

  /* ---- 05 · recon: tiles, route, the seam ---- */

  FIG.recon = (ctx, t, W, H, ac) => {
    ctx.fillStyle = "#080b0f";
    ctx.fillRect(0, 0, W, H);

    const load  = seg(t, .02, .22);
    const route = seg(t, .27, .47);
    const drift = seg(t, .52, .64);   // beat 3 — the destination leaves the tiles
    const fall  = seg(t, .65, .74);   //          and the request goes out
    const sweep = seg(t, .78, .96);   // beat 4 — telemetry along the corridor

    const bx = 90, by = 110, bw = 440, bh = 400;

    // tiles filling in
    const cols = 8, rows = 7, tw = bw / cols, th = bh / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = (r * cols + c) / (rows * cols);
        if (load < k) continue;
        ctx.fillStyle = `rgba(111,207,143,${.02 + ((r + c) % 2) * .018})`;
        ctx.fillRect(bx + c * tw, by + r * th, tw - 1, th - 1);
      }
    }

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `rgba(111,207,143,${.2 + load * .5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);
    mono(ctx, "OFFLINE TILES RESIDENT · DAKSHINA KANNADA", bx, by - 16, 11, "#44515f");

    // roads
    ctx.strokeStyle = "#161e28";
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(60, by + i * 58); ctx.lineTo(W - 60, by + i * 58); ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(60 + i * 86, 60); ctx.lineTo(60 + i * 86, H - 90); ctx.stroke();
    }

    const O = { x: bx + 70, y: by + bh - 70 };
    const inside = { x: bx + 300, y: by + 110 };
    const outside = { x: W - 130, y: 170 };
    const D = {
      x: lerp(inside.x, outside.x, ease(drift)),
      y: lerp(inside.y, outside.y, ease(drift))
    };
    const isOut = D.x > bx + bw;

    // the route
    if (route > 0) {
      const mx = O.x + (D.x - O.x) * .62;
      const draw = (dash, col, w) => {
        ctx.setLineDash(dash);
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(O.x, O.y);
        ctx.lineTo(lerp(O.x, mx, clamp(route * 3)), O.y);
        if (route > .34) ctx.lineTo(mx, lerp(O.y, D.y, clamp(route * 3 - 1)));
        if (route > .67) ctx.lineTo(lerp(mx, D.x, clamp(route * 3 - 2)), D.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      if (isOut && fall > 0) draw([6, 5], `rgba(${hexStr(ac)},${fall})`, 2);
      else draw([], `rgba(111,207,143,${.85})`, 2);

      // the second, highway path
      if (route > .9 && !isOut) {
        ctx.strokeStyle = "rgba(159,173,189,.3)";
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(O.x, O.y);
        ctx.lineTo(O.x, D.y - 40);
        ctx.lineTo(D.x, D.y - 40);
        ctx.lineTo(D.x, D.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // beat 4 — the corridor sweep: telemetry is gathered ALONG the route,
    // which is a different question from a radius around the destination.
    if (sweep > 0 && route > 0) {
      const mx = O.x + (D.x - O.x) * .62;
      const pts = [[O.x, O.y], [mx, O.y], [mx, D.y], [D.x, D.y]];
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        segs.push(L); total += L;
      }
      const want = total * ease(sweep);
      const at = d => {
        let acc = 0;
        for (let i = 0; i < segs.length; i++) {
          if (acc + segs[i] >= d) {
            const k = (d - acc) / segs[i];
            return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
          }
          acc += segs[i];
        }
        return pts[pts.length - 1];
      };

      ctx.beginPath();
      ctx.moveTo(O.x, O.y);
      for (let d = 0; d <= want; d += 6) { const q = at(d); ctx.lineTo(q[0], q[1]); }
      ctx.strokeStyle = `rgba(${hexStr(ac)},.16)`;
      ctx.lineWidth = 26;
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.lineWidth = 1;

      for (let d = 18; d <= want; d += 46) {
        const q = at(d);
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.6, 0, 7);
        ctx.fillStyle = `rgba(${hexStr(ac)},.85)`;
        ctx.fill();
      }
      const head = at(want);
      ctx.beginPath(); ctx.arc(head[0], head[1], 3.5, 0, 7);
      ctx.fillStyle = ac; ctx.fill();
      mono(ctx, "CORRIDOR SWEEP · " + Math.round(ease(sweep) * 46) + " OBSERVATIONS", bx, by + bh + 22, 11, ac);
    }

    // origin + destination
    ctx.beginPath(); ctx.arc(O.x, O.y, 4, 0, 7);
    ctx.fillStyle = "#9fadbd"; ctx.fill();
    mono(ctx, "ORIGIN", O.x + 12, O.y + 4, 10, "#44515f");

    ctx.beginPath(); ctx.arc(D.x, D.y, 7, 0, 7);
    ctx.fillStyle = isOut ? ac : "#6fcf8f";
    ctx.fill();

    if (isOut && drift > .5) {
      ctx.strokeStyle = `rgba(239,95,84,${clamp((drift - .5) * 3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(D.x, D.y, 16 + Math.sin(t * 20) * 3, 0, 7); ctx.stroke();
    }

    // status
    const sy = H - 60;
    ctx.strokeStyle = "#1f2834";
    ctx.beginPath(); ctx.moveTo(60, sy - 34); ctx.lineTo(W - 60, sy - 34); ctx.stroke();

    const engine = isOut && fall > .2 ? "OSRM · NETWORK" : "VALHALLA · LOCAL";
    const egress = isOut && fall > .2 ? "2.4 kB" : "0 B";
    mono(ctx, "ENGINE", 60, sy - 12, 10, "#44515f");
    mono(ctx, engine, 60, sy + 12, 14, isOut && fall > .2 ? ac : "#6fcf8f");
    mono(ctx, "EGRESS", 380, sy - 12, 10, "#44515f");
    mono(ctx, egress, 380, sy + 12, 14, isOut && fall > .2 ? ac : "#6fcf8f");

    if (isOut && fall > .35) {
      mono(ctx, "out of bounds — error intercepted, waypoints re-sent", W - 60, sy + 38, 11, "#67768a", "right");
    } else if (!isOut) {
      mono(ctx, "nothing left the device", W - 60, sy + 38, 11, "#67768a", "right");
    }
  };

  /* ------------------------------------------------- stations + playback */

  const CAPTIONS = {
    aegis:     ["Vessel nominal", "Setpoint arriving", "Approaching the manifold", "Relay open"],
    sentinel:  ["Raw frames", "Detection", "Identity held", "Reconstruction fails"],
    forensics: ["Document received", "The edit", "ELA sweep", "Verdict"],
    risk:      ["Telemetry stream", "Isolation", "Pricing the incident", "Credit flag"],
    recon:     ["Tiles resident", "Route computed", "Fallback engaged", "Corridor sweep"]
  };

  function station(sec) {
    const canvas = $("canvas[data-fig]", sec);
    if (!canvas) return null;

    const key = canvas.dataset.fig;
    const draw = FIG[key];
    const beatsWrap = $("[data-beats='" + key + "']", sec);
    const beatEls = beatsWrap ? $$(".beat", beatsWrap) : [];
    const capEl = $("[data-cap='" + key + "']", sec);
    const numEl = $("[data-beat='" + key + "']", sec);
    const accent = sec.dataset.accent;

    const W = 900, H = 640;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let last = -1;

    function render(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0c1016";
      ctx.fillRect(0, 0, W, H);
      try { draw(ctx, clamp(t), W, H, accent); } catch (_) { /* a figure must never break the page */ }

      const idx = Math.min(3, Math.floor(clamp(t) * 4));
      if (idx !== last) {
        last = idx;
        if (capEl) capEl.textContent = CAPTIONS[key][idx];
        if (numEl) numEl.textContent = "0" + (idx + 1) + " / 04";
        beatEls.forEach((b, i) => b.classList.toggle("live", i === idx));
      }
    }

    function progress() {
      if (!beatsWrap) return 1;
      const r = beatsWrap.getBoundingClientRect();
      const span = r.height - innerHeight * .4;
      return clamp((innerHeight * .55 - r.top) / Math.max(span, 1));
    }

    return { sec, key, render, progress, accent };
  }

  function boot() {
    spine();

    const stations = $$(".station").map(station).filter(Boolean);
    if (!stations.length) return;

    // figures draw their final frame when motion is unwelcome
    if (reduced) {
      stations.forEach(s => { s.render(1); s.sec.querySelectorAll(".beat").forEach(b => b.classList.add("live")); });
      tint(stations[0].accent);
    }

    const ticks = $$("[data-go]");
    ticks.forEach(b => b.addEventListener("click", () => {
      const el = document.getElementById(b.dataset.go);
      if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }));

    let current = null;
    let queued = false;

    function frame() {
      queued = false;

      // which station owns the middle of the screen
      let own = null;
      for (const s of stations) {
        const r = s.sec.getBoundingClientRect();
        if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) { own = s; break; }
      }
      if (own && own !== current) {
        current = own;
        tint(own.accent);
        ticks.forEach(b => b.setAttribute("aria-current", String(b.dataset.go === own.sec.id)));
      }
      if (!own) ticks.forEach(b => b.removeAttribute("aria-current"));

      if (reduced) return;

      for (const s of stations) {
        const r = s.sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        s.render(s.progress());
      }
    }

    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    frame();
    // a timer, because a frame callback is not a promise
    setTimeout(frame, 400);
    setTimeout(frame, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

