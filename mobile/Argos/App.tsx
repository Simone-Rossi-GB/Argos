import { useState } from 'react';
import HomeScreen from './src/HomeScreen';
import CameraScreen from './src/CameraScreen';
import SettingScreen from './src/SettingScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');

  const navigation = {
    navigate: (screen: string) => setCurrentScreen(screen),
  };

  if (currentScreen === 'Camera') {
    return <CameraScreen navigation={navigation} />;
  }

  if (currentScreen === 'Settings') {
    return <SettingScreen navigation={navigation} />;
  }

  return <HomeScreen navigation={navigation} />;
}
