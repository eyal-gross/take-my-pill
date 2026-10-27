import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { View } from 'react-native';
import type { TimeOfDay } from '../engine/types';
import { formatTimeOfDay, useLanguage } from '../i18n';
import { useTheme } from '../theme/useTheme';
import { Row, type UiSize } from './Card';
import { Collapsible } from './Collapsible';

interface Props {
  label: string;
  value: TimeOfDay;
  onChange: (t: TimeOfDay) => void;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  last?: boolean;
  hint?: string;
  size?: UiSize;
  /** Uncontrolled: start expanded. */
  open?: boolean;
  /** Controlled mode (accordion): parent owns the open state. */
  expanded?: boolean;
  onToggle?: () => void;
}

export function TimePickerRow({ label, value, onChange, minuteInterval = 5, last, hint, size = 'md', open = false, expanded, onToggle }: Props) {
  const theme = useTheme();
  const language = useLanguage();
  const [localOpen, setLocalOpen] = useState(open);
  const isOpen = expanded ?? localOpen;
  const toggle = onToggle ?? (() => setLocalOpen((e) => !e));
  const date = new Date();
  date.setHours(value.h, value.m, 0, 0);

  return (
    <View>
      <Row label={label} value={formatTimeOfDay(value.h, value.m)} onPress={toggle} last={last && !isOpen} hint={hint} size={size} />
      <Collapsible open={isOpen}>
        <View style={{ paddingBottom: 8, alignItems: 'center' }}>
          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            minuteInterval={minuteInterval}
            locale={language === 'he' ? 'he-IL' : 'en-GB'}
            textColor={theme.colors.textPrimary}
            themeVariant={theme.name}
            onChange={(_, d) => {
              if (d) onChange({ h: d.getHours(), m: d.getMinutes() });
            }}
            style={{ height: 180, alignSelf: 'stretch' }}
          />
        </View>
      </Collapsible>
    </View>
  );
}
