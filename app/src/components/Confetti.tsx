import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { confettiPalette } from '../theme/tokens';

/**
 * Custom confetti. Not a library, not emoji.
 * ~140 particles in three shapes (petal, disc, ribbon) in the brand palette, bursting from the
 * button rim with a slight upward bias, then falling under gravity with air drag, a gentle lateral
 * wind and per-particle tumbling. A soft glow pulse marks the origin. Fully analytic motion driven
 * by one clock value, so each frame is a pure function of time — no per-frame state to drift.
 */

export interface ConfettiHandle {
  fire: (origin: { x: number; y: number }) => void;
}

const COUNT = 140;
const DURATION = 2.4; // seconds
const GRAVITY = 1500; // pt/s²
const FIELDS = 9; // numbers per particle in the flat params array
const COLORS = confettiPalette.length;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParams(seed: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < COUNT; i++) {
    const angle = rnd() * Math.PI * 2;
    const speed = 420 + rnd() * 720;
    const shape = Math.floor(rnd() * 3); // 0 petal, 1 disc, 2 ribbon
    const color = i % COLORS;
    const size = 5 + rnd() * 6;
    const spin = (rnd() - 0.5) * 14;
    const phase = rnd() * Math.PI * 2;
    const wind = (rnd() - 0.5) * 2;
    const delay = rnd() * 0.12;
    out.push(angle, speed, shape, color, size, spin, phase, wind, delay);
  }
  return out;
}

export const Confetti = forwardRef<ConfettiHandle, object>(function Confetti(_, ref) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(-1); // seconds since fire, -1 = idle
  const startTs = useSharedValue(-1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const params = useSharedValue<number[]>([]);

  // The worklet below captures `stop` when it is created, so `stop` must exist before the
  // frame callback and must not reference `frame` directly (circular) — hence the ref.
  const frameRef = useRef<ReturnType<typeof useFrameCallback> | null>(null);
  const stop = useCallback(() => frameRef.current?.setActive(false), []);

  const frame = useFrameCallback((info) => {
    if (clock.value < 0) return;
    if (startTs.value < 0) startTs.value = info.timestamp;
    const t = (info.timestamp - startTs.value) / 1000;
    if (t >= DURATION) {
      clock.value = -1;
      startTs.value = -1;
      runOnJS(stop)();
      return;
    }
    clock.value = t;
  }, false);
  frameRef.current = frame;

  useImperativeHandle(
    ref,
    () => ({
      fire: ({ x, y }) => {
        params.value = makeParams(Date.now() % 100000);
        originX.value = x;
        originY.value = y;
        startTs.value = -1;
        clock.value = 0;
        frame.setActive(true);
      },
    }),
    [frame, params, originX, originY, startTs, clock],
  );

  const buildPath = (colorIndex: number) =>
    useDerivedValue(() => {
      const path = Skia.Path.Make();
      const t = clock.value;
      if (t < 0) return path;
      const p = params.value;
      const ox = originX.value;
      const oy = originY.value;
      const k = 2.2; // drag

      for (let i = 0; i < COUNT; i++) {
        const base = i * FIELDS;
        if (p[base + 3] !== colorIndex) continue;
        const delay = p[base + 8];
        const tt = t - delay;
        if (tt <= 0) continue;

        const angle = p[base];
        const speed = p[base + 1];
        const shape = p[base + 2];
        const size = p[base + 4];
        const spin = p[base + 5];
        const phase = p[base + 6];
        const wind = p[base + 7];

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 380;
        const e = Math.exp(-k * tt);
        const drift = (1 - e) / k;
        const x = ox + vx * drift + wind * Math.sin(tt * 1.7 + phase) * 22 * tt;
        const y = oy + vy * drift + (GRAVITY / k) * (tt - drift);
        if (y > height + 40) continue;

        const rot = phase + spin * tt;
        const flutter = Math.cos(tt * 9 + phase);
        const sx = shape === 1 ? 1 : 0.35 + 0.65 * Math.abs(flutter);

        const shapePath = Skia.Path.Make();
        if (shape === 0) {
          shapePath.addOval(Skia.XYWHRect(-size * 0.5, -size, size, size * 2));
        } else if (shape === 1) {
          shapePath.addCircle(0, 0, size * 0.6);
        } else {
          shapePath.addRRect(Skia.RRectXY(Skia.XYWHRect(-size, -size * 0.28, size * 2, size * 0.56), size * 0.2, size * 0.2));
        }
        const m = Skia.Matrix();
        m.translate(x, y);
        m.rotate(rot);
        m.scale(sx, 1);
        path.addPath(shapePath, m);
      }
      return path;
    });

  // Hooks must be called unconditionally and in a stable order: one per palette color.
  const path0 = buildPath(0);
  const path1 = buildPath(1);
  const path2 = buildPath(2);
  const path3 = buildPath(3);
  const path4 = buildPath(4);
  const paths = [path0, path1, path2, path3, path4];

  const opacity = useDerivedValue(() => {
    const t = clock.value;
    if (t < 0) return 0;
    const fadeStart = DURATION * 0.7;
    return t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / (DURATION - fadeStart));
  });

  const glowR = useDerivedValue(() => {
    const t = clock.value;
    if (t < 0) return 0;
    const u = Math.min(1, t / 0.7);
    return 40 + 160 * (1 - (1 - u) * (1 - u));
  });
  const glowOpacity = useDerivedValue(() => {
    const t = clock.value;
    if (t < 0) return 0;
    return Math.max(0, 0.42 * (1 - t / 0.7));
  });

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group opacity={glowOpacity}>
        <Circle cx={originX} cy={originY} r={glowR} color={confettiPalette[1]}>
          <BlurMask blur={40} style="normal" />
        </Circle>
      </Group>
      <Group opacity={opacity}>
        {paths.map((p, i) => (
          <Path key={i} path={p} color={confettiPalette[i]} />
        ))}
      </Group>
    </Canvas>
  );
});
