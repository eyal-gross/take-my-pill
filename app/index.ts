import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';

// Direction is handled manually in useDir(). Never let iOS mirror the layout natively on
// Hebrew-language phones, otherwise rows and text get flipped twice and land on the wrong side.
I18nManager.allowRTL(false);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
