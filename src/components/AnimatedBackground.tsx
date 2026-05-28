"use client";

import { useEffect, useRef } from "react";

export type BgMode = "stars" | "rain" | "storm" | "void";

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
