import * as RNLocalize from 'react-native-localize';

const MAP = {
    IN: '+91',
    US: '+1',
    GB: '+44',
    AE: '+971',
    SA: '+966',
};

export function getDefaultCallingCode() {
    const country = RNLocalize.getCountry();
    return MAP[country] || '+91';
}
