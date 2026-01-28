import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@farmers';

export const getAllFarmers = async () => {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
};

export const saveFarmerData = async (farmer) => {
    const existing = await getAllFarmers();
    const updated = [farmer, ...existing];
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
};
