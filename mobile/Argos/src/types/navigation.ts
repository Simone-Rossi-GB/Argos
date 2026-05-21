import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Settings: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
