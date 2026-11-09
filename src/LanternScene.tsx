import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
// Pixi's static uniform synchronizers support the app's CSP without dynamic eval.
import 'pixi.js/unsafe-eval';
export function LanternScene({ glow, reducedMotion }: { glow: number; reducedMotion: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const value = useRef(glow); value.current = glow;
  useEffect(() => {
    const app = new Application();
    let disposed = false, initialized = false;
    void (async () => {
      await app.init({ width: 1100, height: 590, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
      initialized = true;
      if (disposed) { app.destroy(true, { children: true }); return; }
      host.current?.appendChild(app.canvas);
      const sky = new Graphics();
      sky.rect(0, 0, 1100, 590).fill(0x102c3b);
      sky.circle(812, 109, 42).fill(0xd8e3cf).circle(831, 96, 40).fill(0x102c3b);
      for (let i = 0; i < 60; i++) sky.circle((i * 193 + 34) % 1100, (i * 67 + 17) % 265, i % 4 === 0 ? 1.4 : 0.7).fill({ color: 0xb8d0ca, alpha: 0.5 });
      sky.poly([0, 300, 100, 245, 200, 281, 295, 205, 420, 289, 580, 257, 745, 310, 1100, 264, 1100, 590, 0, 590]).fill(0x173c45);
      sky.rect(0, 342, 1100, 248).fill(0x0b2936);
      for (let i = 0; i < 32; i++) sky.roundRect((i * 173) % 1100, 359 + (i * 31) % 200, 20 + i % 5 * 12, 1, 1).fill({ color: 0x598486, alpha: 0.25 });
      // The shoreline and village are drawn assets, keeping the build entirely self-contained.
      sky.poly([0, 375, 130, 341, 280, 355, 422, 391, 580, 425, 603, 590, 0, 590]).fill(0x091e28);
      for (let i = 0; i < 6; i++) {
        const x = 65 + i * 63, y = 313 + (i % 3) * 13;
        sky.rect(x, y, 48, 55).fill(i % 2 ? 0x25414a : 0x324952);
        sky.poly([x - 6, y, x + 24, y - 29, x + 54, y]).fill(0x142630);
        sky.rect(x + 10, y + 15, 9, 14).fill({ color: 0xd7a669, alpha: 0.45 });
        sky.rect(x + 30, y + 15, 9, 14).fill({ color: 0xd7a669, alpha: 0.45 });
      }
      // Jetty in the foreground.
      sky.poly([400, 590, 499, 428, 584, 428, 714, 590]).fill(0x3a4648);
      for (let i = 0; i < 8; i++) sky.moveTo(480 - i * 10, 445 + i * 21).lineTo(596 + i * 14, 445 + i * 21).stroke({ width: 2, color: 0x152b33 });
      sky.rect(484, 329, 9, 136).fill(0x13222b).moveTo(488, 333).lineTo(545, 333).lineTo(545, 351).stroke({ width: 6, color: 0x13222b });
      app.stage.addChild(sky);
      const lantern = new Container(); lantern.position.set(545, 382);
      const halo = new Graphics();
      for (let i = 8; i > 0; i--) halo.circle(0, 0, i * 13).fill({ color: 0xf3bd6a, alpha: 0.017 });
      lantern.addChild(halo);
      lantern.addChild(new Graphics().roundRect(-15, -22, 30, 43, 4).fill(0xf7c574).stroke({ width: 3, color: 0x5b4430 }).poly([-20, -23, 0, -34, 20, -23]).fill(0x3e3931).rect(-19, 21, 38, 5).fill(0x3e3931).moveTo(0, -22).lineTo(0, 22).stroke({ width: 2, color: 0x967448 }));
      app.stage.addChild(lantern);
      let smooth = value.current;
      app.ticker.add(ticker => {
        smooth += (value.current - smooth) * Math.min(1, ticker.deltaMS / (reducedMotion ? 80 : 230));
        halo.alpha = smooth; lantern.alpha = 0.4 + smooth * 0.6;
        halo.scale.set(reducedMotion ? 1 : 0.7 + smooth * 0.5);
      });
    })().catch(error => { console.error('Village renderer unavailable:', error); if (host.current) host.current.textContent = 'The lantern scene needs a graphics-capable desktop.'; });
    return () => { disposed = true; if (initialized) app.destroy(true, { children: true }); };
  }, [reducedMotion]);
  return <div className="scene" ref={host} role="img" aria-label="A moonlit coastal village and a lantern on the harbor jetty" />;
}
