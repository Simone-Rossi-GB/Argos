import React from 'react';
import { View, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from './types/navigation';

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  return (
    <View>
      <Button title="Impostazioni" onPress={() => navigation.navigate('Settings')} />
    </View>
  );
}
