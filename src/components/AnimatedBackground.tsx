"use client";

import { useEffect, useRef } from "react";

export type BgMode = "stars" | "rain" | "storm" | "void" | "blackhole";

interface Props { mode?: BgMode }

export function AnimatedBackground({ mode = "stars" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Stars ────────────────────────────────────────────────
    if (mode === "stars") {
      const STAR_COUNT = 200;
      const stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        alpha: Math.random(),
        speed: Math.random() * 0.004 + 0.001,
        drift: (Math.random() - 0.5) * 0.12,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
          s.alpha += s.speed;
          if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
          s.x += s.drift;
          if (s.x < 0) s.x = canvas.width;
          if (s.x > canvas.width) s.x = 0;

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${s.alpha * 0.6})`;
          ctx.fill();
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Rain ─────────────────────────────────────────────────
    if (mode === "rain") {
      const DROPS = 180;
      const drops = Array.from({ length: DROPS }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 18 + 6,
        speed: Math.random() * 8 + 4,
        alpha: Math.random() * 0.25 + 0.08,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(160,160,220,1)";
        ctx.lineWidth = 0.7;
        for (const d of drops) {
          ctx.globalAlpha = d.alpha;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 1, d.y + d.len);
          ctx.stroke();
          d.y += d.speed;
          if (d.y > canvas.height) {
            d.y = -d.len;
            d.x = Math.random() * canvas.width;
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Storm ─────────────────────────────────────────────────
    if (mode === "storm") {
      const DROPS = 280;
      const drops = Array.from({ length: DROPS }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 24 + 10,
        speedY: Math.random() * 14 + 8,
        speedX: Math.random() * 5 + 3,
        alpha: Math.random() * 0.3 + 0.1,
      }));
      let lightning = 0;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Lightning flash
        if (Math.random() < 0.003) lightning = 8;
        if (lightning > 0) {
          ctx.fillStyle = `rgba(200,200,255,${lightning * 0.01})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          lightning--;
          if (lightning === 7) {
            // Draw bolt
            ctx.strokeStyle = "rgba(220,220,255,0.9)";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#aaf";
            ctx.shadowBlur = 20;
            ctx.beginPath();
            const bx = Math.random() * canvas.width;
            ctx.moveTo(bx, 0);
            let cy = 0;
            while (cy < canvas.height * 0.6) {
              cy += Math.random() * 40 + 20;
              ctx.lineTo(bx + (Math.random() - 0.5) * 60, cy);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        ctx.strokeStyle = "rgba(140,140,200,1)";
        ctx.lineWidth = 0.8;
        for (const d of drops) {
          ctx.globalAlpha = d.alpha;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * 1.2, d.y + d.len);
          ctx.stroke();
          d.y += d.speedY;
          d.x += d.speedX;
          if (d.y > canvas.height || d.x > canvas.width) {
            d.y = -d.len;
            d.x = Math.random() * canvas.width;
          }
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Void ─────────────────────────────────────────────────
    if (mode === "void") {
      let t = 0;
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rings = 5;
        for (let i = rings; i >= 1; i--) {
          const r = (i / rings) * Math.min(cx, cy) * 0.8 + Math.sin(t * 0.6 + i) * 10;
          const alpha = 0.03 + (i / rings) * 0.04;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(140,80,255,${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // Floating particles
        const pts = 40;
        for (let j = 0; j < pts; j++) {
          const angle = (j / pts) * Math.PI * 2 + t * 0.2;
          const radius = Math.min(cx, cy) * 0.45 + Math.sin(t + j * 1.3) * 30;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(167,139,250,${0.15 + Math.sin(t * 2 + j) * 0.1})`;
          ctx.fill();
        }
        t += 0.012;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    // ── Black hole ───────────────────────────────────────────
    // A central event horizon with a glowing accretion disk; matter
    // spirals inward, accelerating + stretching as it nears the horizon,
    // then is consumed and respawns at the outer edge. A periodic
    // "feeding pulse" flings in a fresh burst of matter.
    if (mode === "blackhole") {
      const cx = () => canvas.width / 2;
      const cy = () => canvas.height / 2;
      const horizon = () => Math.max(26, Math.min(canvas.width, canvas.height) * 0.06);

      type Bit = { ang: number; dist: number; spin: number; size: number; hue: number; alive: boolean };
      const MAX = 240;
      const reach = () => Math.hypot(canvas.width, canvas.height) * 0.55;

      const spawn = (burst = false): Bit => {
        const d = burst
          ? reach() * (0.7 + Math.random() * 0.3)
          : reach() * (0.25 + Math.random() * 0.75);
        return {
          ang: Math.random() * Math.PI * 2,
          dist: d,
          spin: (Math.random() * 0.6 + 0.5) * (Math.random() < 0.5 ? 1 : 1), // all co-rotating
          size: Math.random() * 1.6 + 0.5,
          hue: 255 + Math.random() * 35, // violet→blue accretion
          alive: true,
        };
      };

      const bits: Bit[] = Array.from({ length: MAX }, () => spawn());
      let t = 0;
      let pulse = 0; // frames since last feeding pulse
      const PULSE_EVERY = 260; // ~4–5s at 60fps: the periodic "suck" event

      const draw = () => {
        const w = canvas.width, h = canvas.height;
        const X = cx(), Y = cy(), rh = horizon();

        // Trails: fade the previous frame instead of clearing (motion blur).
        ctx.fillStyle = "rgba(4,2,8,0.28)";
        ctx.fillRect(0, 0, w, h);

        // Accretion glow halo around the horizon.
        const halo = ctx.createRadialGradient(X, Y, rh * 0.6, X, Y, rh * 4.2);
        halo.addColorStop(0, "rgba(167,139,250,0.22)");
        halo.addColorStop(0.4, "rgba(120,80,255,0.10)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(X, Y, rh * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Feeding pulse — periodically inject a burst of fresh matter.
        pulse++;
        const feeding = pulse % PULSE_EVERY < 24;
        if (pulse % PULSE_EVERY === 0) {
          let injected = 0;
          for (const b of bits) {
            if (!b.alive && injected < 60) { Object.assign(b, spawn(true)); injected++; }
          }
        }

        for (const b of bits) {
          if (!b.alive) {
            // respawn drifting matter from the outer edge
            if (Math.random() < 0.03) Object.assign(b, spawn());
            continue;
          }
          // Gravity: pull inward; orbital speed rises sharply near the horizon.
          const pull = 0.6 + (rh * 14) / (b.dist + rh);
          b.dist -= pull;
          b.ang += (b.spin * (rh * 0.9)) / (b.dist + rh * 0.5);

          if (b.dist <= rh) { b.alive = false; continue; } // consumed

          // Spaghettification: stretch the bit along its orbit as it falls in.
          const near = 1 - Math.min(1, (b.dist - rh) / (reach() * 0.5));
          const px = X + Math.cos(b.ang) * b.dist;
          const py = Y + Math.sin(b.ang) * b.dist;
          const tx = X + Math.cos(b.ang + 0.18) * (b.dist + 10 + near * 40);
          const ty = Y + Math.sin(b.ang + 0.18) * (b.dist + 10 + near * 40);

          ctx.strokeStyle = `hsla(${b.hue}, 90%, ${55 + near * 25}%, ${0.18 + near * 0.55})`;
          ctx.lineWidth = b.size * (1 + near * 1.5);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }

        // Photon ring: bright rim just outside the horizon.
        ctx.strokeStyle = `rgba(190,170,255,${feeding ? 0.9 : 0.55})`;
        ctx.lineWidth = 2 + (feeding ? 1.5 : 0);
        ctx.shadowColor = "#b9a6ff";
        ctx.shadowBlur = feeding ? 28 : 16;
        ctx.beginPath();
        ctx.arc(X, Y, rh * 1.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Event horizon: pure black void.
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(X, Y, rh, 0, Math.PI * 2);
        ctx.fill();

        t += 0.01;
        raf = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.75 }}
    />
  );
}
