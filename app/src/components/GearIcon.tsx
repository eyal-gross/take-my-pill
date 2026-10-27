import { Canvas, Path } from '@shopify/react-native-skia';
import React from 'react';
import { View } from 'react-native';

const GEAR =
  'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';
const CIRCLE = 'M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z';

/** Settings gear, stroked with Skia so it matches the app's line weight without an icon font. */
export function GearIcon({ size = 24, color }: { size?: number; color: string }) {
  const k = size / 24;
  // pointerEvents none: the canvas must never swallow the tap meant for the button around it.
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Path path={GEAR} style="stroke" strokeWidth={1.8 / k} strokeJoin="round" strokeCap="round" color={color} transform={[{ scale: k }]} />
        <Path path={CIRCLE} style="stroke" strokeWidth={1.8 / k} color={color} transform={[{ scale: k }]} />
      </Canvas>
    </View>
  );
}
