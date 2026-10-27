import { Canvas, Path } from '@shopify/react-native-skia';
import React from 'react';
import { View } from 'react-native';

// 24x24 stroked paths, same line weight as GearIcon.
const PENCIL = ['M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z', 'M14.5 5.5l3 3'];
const TRASH = ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4h6v3'];

function LineIcon({ paths, size, color }: { paths: string[]; size: number; color: string }) {
  const k = size / 24;
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {paths.map((p) => (
          <Path key={p} path={p} style="stroke" strokeWidth={2 / k} strokeJoin="round" strokeCap="round" color={color} transform={[{ scale: k }]} />
        ))}
      </Canvas>
    </View>
  );
}

export const PencilIcon = ({ size = 20, color }: { size?: number; color: string }) => <LineIcon paths={PENCIL} size={size} color={color} />;
export const TrashIcon = ({ size = 20, color }: { size?: number; color: string }) => <LineIcon paths={TRASH} size={size} color={color} />;
