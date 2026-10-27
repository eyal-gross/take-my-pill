import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { Row, type UiSize } from './Card';
import { Collapsible } from './Collapsible';

const ITEM = 44;
const VISIBLE = 5;

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
  hint?: string;
  last?: boolean;
  size?: UiSize;
  /** Controlled accordion, like TimePickerRow. */
  expanded: boolean;
  onToggle: () => void;
}

/** A settings row that opens into a scroll wheel of whole numbers (pure JS, no native picker). */
export function NumberWheelRow({ label, value, min, max, format, onChange, hint, last, size = 'md', expanded, onToggle }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const ref = useRef<ScrollView>(null);
  const [live, setLive] = useState(value);
  const lastIdx = useRef(value - min);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  useEffect(() => {
    setLive(value);
    lastIdx.current = value - min;
  }, [value, min]);

  useEffect(() => {
    if (expanded) requestAnimationFrame(() => ref.current?.scrollTo({ y: (value - min) * ITEM, animated: false }));
    // Only when opening: scrolling itself updates value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Safety net: if a scroll ended without a snap event, save what the row shows when it closes.
  useEffect(() => {
    if (!expanded && live !== value) onChange(live);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const idxFrom = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));

  return (
    <View>
      <Row label={label} value={format(live)} onPress={onToggle} last={last && !expanded} hint={expanded ? undefined : hint} size={size} />
      <Collapsible open={expanded}>
        <View style={styles.wrap}>
          <View pointerEvents="none" style={[styles.band, { backgroundColor: c.surfaceRaised }]} />
          <ScrollView
            ref={ref}
            style={styles.wheel}
            contentContainerStyle={{ paddingVertical: ITEM * 2 }}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={(e) => {
              const i = idxFrom(e);
              if (i !== lastIdx.current) {
                lastIdx.current = i;
                setLive(values[i]);
                haptics.select();
              }
            }}
            onMomentumScrollEnd={(e) => onChange(values[idxFrom(e)])}
            onScrollEndDrag={(e) => {
              // A slow drag with no momentum never fires onMomentumScrollEnd.
              if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) onChange(values[idxFrom(e)]);
            }}
          >
            {values.map((n) => (
              <View key={n} style={styles.item}>
                <AppText
                  variant={n === live ? 'bodyLarge' : 'body'}
                  color={n === live ? c.textPrimary : c.textTertiary}
                  align="center"
                  style={n === live ? styles.cur : undefined}
                >
                  {format(n)}
                </AppText>
              </View>
            ))}
          </ScrollView>
          {hint && (
            <AppText variant={size === 'lg' ? 'captionLarge' : 'caption'} color={c.textTertiary} align="center" style={styles.hint}>
              {hint}
            </AppText>
          )}
        </View>
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 12 },
  wheel: { height: ITEM * VISIBLE },
  band: { position: 'absolute', top: ITEM * 2, left: 0, right: 0, height: ITEM, borderRadius: 12 },
  item: { height: ITEM, justifyContent: 'center' },
  cur: { fontWeight: '600' },
  hint: { marginTop: 10 },
});
