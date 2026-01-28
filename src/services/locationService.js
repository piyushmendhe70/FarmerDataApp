import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export async function requestLocationPermission() {
    if (Platform.OS !== 'android') return true;

    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
            title: 'Location Permission',
            message: 'We need your location to calculate distance from APMC market.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
        },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );
    });
}
