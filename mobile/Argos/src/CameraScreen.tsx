import React from 'react';
import { View, Text } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

const device = useCameraDevice('back');

export default function CameraScreen() {
    return (
            <View>
                <Camera
                    ref={cameraRef}
                    device={device}
                    isActive={true}
                    frameProcessor={frameProcessor}
                />
            </View>
            );
}
