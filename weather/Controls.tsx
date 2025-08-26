import { Text, TextProps } from 'react-native';

export function MadoText(props: TextProps) {
  // change default allowFontScaling=true to false
  const allowFontScaling = props.allowFontScaling ?? false;
  return <Text {...props} allowFontScaling={allowFontScaling}  />;
}
