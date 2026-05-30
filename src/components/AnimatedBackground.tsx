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

      // Background starfield — twinkles + gets gravitationally lensed near the hole.
      type FarStar = { x: number; y: number; r: number; tw: number; sp: number };
      const FARS = 120;
      const fars: FarStar[] = Array.from({ length: FARS }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.2 + 0.3,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.05 + 0.01,
      }));

      // The doomed star — a sun that slowly spirals in and is torn apart (a
      // tidal disruption event). It loses mass into a glowing spaghettified
      // stream that wraps the horizon, then a new star wanders in.
      type Sun = { ang: number; dist: number; spin: number; trail: { x: number; y: number }[]; alive: boolean; cool: number };
      const SUN_TRAIL = 74; // how many past positions form the spaghettified stream
      const newSun = (): Sun => ({
        ang: Math.random() * Math.PI * 2,
        dist: reach() * (0.82 + Math.random() * 0.18),
        spin: 0.6 + Math.random() * 0.25, // co-rotating with the disk
        trail: [],
        alive: true,
        cool: 0,
      });
      let sun: Sun = newSun();

      let t = 0;
      let pulse = 0; // frames since last feeding pulse
      const PULSE_EVERY = 270; // ~4.5s at 60fps: the periodic "suck" event (< 5s)

      const draw = () => {
        const w = canvas.width, h = canvas.height;
        const X = cx(), Y = cy(), rh = horizon();

        // Trails: fade the previous frame instead of clearing (motion blur).
        ctx.fillStyle = "rgba(4,2,8,0.28)";
        ctx.fillRect(0, 0, w, h);

        // Background starfield — distant stars twinkle and bend toward the hole
        // (a soft gravitational-lensing displacement that grows close to center).
        for (const s of fars) {
          s.tw += s.sp;
          let sx = s.x * w, sy = s.y * h;
          const dx = sx - X, dy = sy - Y, dd = Math.hypot(dx, dy) || 1;
          const lens = (rh * rh * 2.2) / (dd + rh); // pull light inward
          sx -= (dx / dd) * lens;
          sy -= (dy / dd) * lens;
          const a = 0.25 + Math.sin(s.tw) * 0.25;
          ctx.fillStyle = `rgba(220,225,255,${Math.max(0, a)})`;
          ctx.fillRect(sx, sy, s.r, s.r);
        }

        // Accretion glow halo around the horizon.
        const halo = ctx.createRadialGradient(X, Y, rh * 0.6, X, Y, rh * 4.2);
        halo.addColorStop(0, "rgba(167,139,250,0.22)");
        halo.addColorStop(0.4, "rgba(120,80,255,0.10)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(X, Y, rh * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Feeding pulse — periodically inject a big burst of fresh matter.
        pulse++;
        const phase = pulse % PULSE_EVERY;
        const feeding = phase < 24;
        if (phase === 0) {
          let injected = 0;
          for (const b of bits) {
            if (!b.alive && injected < 90) { Object.assign(b, spawn(true)); injected++; }
          }
        }

        // Shockwave: a bright ring races inward toward the horizon right after
        // each pulse, making the "suck" cadence read clearly.
        if (phase < 46) {
          const p = phase / 46;
          const swR = rh * 1.18 + (1 - p) * reach() * 0.5;
          ctx.strokeStyle = `rgba(190,170,255,${(1 - p) * 0.5})`;
          ctx.lineWidth = 2.5 * (1 - p) + 0.5;
          ctx.beginPath();
          ctx.arc(X, Y, swR, 0, Math.PI * 2);
          ctx.stroke();
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

        // ── The doomed star: rides the SAME swirl as the accretion matter ──
        // It obeys the identical gravity + orbital law as the particles above
        // (just slower, so it makes many visible loops), and its spaghettified
        // stream is literally the path it has swirled through — not a fake arc.
        const tidalR = rh * 6.5;
        if (sun.alive) {
          const pull = 0.6 + (rh * 14) / (sun.dist + rh);              // identical gravity law
          sun.dist -= pull * 0.42;                                     // slowed → more orbits, clear swirl
          sun.ang += (sun.spin * (rh * 0.9)) / (sun.dist + rh * 0.5);  // identical orbital law
          sun.trail.push({ x: X + Math.cos(sun.ang) * sun.dist, y: Y + Math.sin(sun.ang) * sun.dist });
          if (sun.trail.length > SUN_TRAIL) sun.trail.shift();
          if (sun.dist <= rh * 1.2) {
            sun.alive = false;
            sun.cool = 70 + Math.floor(Math.random() * 70);
            ctx.fillStyle = "rgba(255,240,210,0.5)"; // tidal-disruption flare
            ctx.beginPath(); ctx.arc(X, Y, rh * 3, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // Drain the leftover stream into the hole, then a new star wanders in.
          sun.trail.shift();
          if (sun.trail.length <= 1 && --sun.cool <= 0) sun = newSun();
        }

        const stretch = Math.max(0, Math.min(1, (tidalR - sun.dist) / (tidalR - rh)));

        // Stream = the star's actual swirling trajectory, glowing hotter and
        // fatter as the plasma nears the horizon (real tidal-stream look).
        const tr = sun.trail;
        for (let k = 1; k < tr.length; k++) {
          const f = k / tr.length; // 0 = oldest (outer), →1 = the star itself
          const dh = Math.hypot(tr[k].x - X, tr[k].y - Y);
          const near = 1 - Math.min(1, (dh - rh) / (reach() * 0.5));
          const hue = 50 - near * 38; // gold → orange-red toward the hole
          ctx.strokeStyle = `hsla(${hue}, 100%, ${56 + near * 34}%, ${0.22 + f * 0.6})`;
          ctx.lineWidth = 1.1 + near * 3 + (sun.alive ? f * 2 : 0);
          ctx.beginPath();
          ctx.moveTo(tr[k - 1].x, tr[k - 1].y);
          ctx.lineTo(tr[k].x, tr[k].y);
          ctx.stroke();
        }

        // The star core at the head of its stream — elongated along its orbit
        // as the tidal force spaghettifies it, hotter/whiter the closer it gets.
        if (sun.alive && tr.length) {
          const head = tr[tr.length - 1];
          const coreR = 6 + (1 - stretch) * 6;
          const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, coreR * 3.2);
          glow.addColorStop(0, `rgba(255,${245 - stretch * 85},${205 - stretch * 150},0.95)`);
          glow.addColorStop(0.5, `rgba(255,${178 - stretch * 90},80,0.32)`);
          glow.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = glow;
          ctx.save();
          ctx.translate(head.x, head.y);
          ctx.rotate(sun.ang);
          ctx.scale(1 + stretch * 2.6, Math.max(0.3, 1 - stretch * 0.6)); // tidal elongation
          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Relativistic jets: twin beams blast perpendicular to the disk while
        // the hole feeds — brightest right at the pulse.
        if (feeding) {
          const jet = reach() * 0.9;
          const jw = 10 + (24 - phase) * 0.8;
          for (const dir of [-1, 1]) {
            const ex = X, ey = Y + dir * jet;
            const grad = ctx.createLinearGradient(X, Y, ex, ey);
            grad.addColorStop(0, "rgba(200,210,255,0.55)");
            grad.addColorStop(1, "rgba(120,90,255,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(X - jw, Y);
            ctx.lineTo(X + jw, Y);
            ctx.lineTo(ex, ey);
            ctx.closePath();
            ctx.fill();
          }
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
