import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useDir } from '../hooks/useDir';
import { useLanguage } from '../i18n';
import { textStyle, type TextVariant } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export function AppText({ variant = 'body', color, align, style, children, ...rest }: Props) {
  const theme = useTheme();
  const language = useLanguage();
  const dir = useDir();
  const spec = textStyle(variant, language);
  return (
    <Text
      {...rest}
      style={[
        spec,
        {
          color: color ?? theme.colors.textPrimary,
          textAlign: align ?? dir.textAlign,
          writingDirection: dir.writingDirection,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
