import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';

import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { fetchPincodeData } from '../services/pincodeService';
import { saveFarmerData } from '../services/storageService';
import { calculateDistanceKm } from '../utils/distanceCalculator';
import { getDefaultCallingCode } from '../utils/countryCode';
import { getCurrentPosition, requestLocationPermission } from '../services/locationService';

const KALMESHWAR = { lat: 21.2400895, lon: 78.9009647 };

export default function FarmerRegistrationScreen({ navigation }) {
    // Step order that best matches “Pin code (first input)” requirement
    const [step, setStep] = useState(1); // 1=Location, 2=Details, 3=Review

    // Location (PIN first)
    const [pincode, setPincode] = useState('');
    const [stateName, setStateName] = useState('');
    const [district, setDistrict] = useState('');
    const [taluka, setTaluka] = useState('');
    const [locationLocked, setLocationLocked] = useState(true);
    const [pinLoading, setPinLoading] = useState(false);
    const [pinMsg, setPinMsg] = useState('');

    // Details
    const [farmerName, setFarmerName] = useState('');
    const [callingCode] = useState(getDefaultCallingCode());
    const [mobile, setMobile] = useState('');
    const [village, setVillage] = useState('');
    const [cropName, setCropName] = useState('');
    const [acreage, setAcreage] = useState('');
    const [harvestingDate, setHarvestingDate] = useState(null); // Date | null

    // Formatting
    const formatDate = (d) => {
        if (!d) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    };

    const openHarvestDatePicker = () => {
        DateTimePickerAndroid.open({
            value: harvestingDate ?? new Date(),
            mode: 'date',
            onChange: (event, selectedDate) => {
                if (event?.type === 'set' && selectedDate) {
                    setHarvestingDate(selectedDate);
                }
            },
        });
    };

    // Live validation (instant under field)
    const pinError = useMemo(() => {
        if (pincode.length === 0) return '';
        if (!/^\d+$/.test(pincode)) return 'PIN must be numeric';
        if (pincode.length !== 6) return 'PIN must be exactly 6 digits';
        return '';
    }, [pincode]);

    const mobileError = useMemo(() => {
        if (mobile.length === 0) return '';
        if (!/^\d+$/.test(mobile)) return 'Mobile must be numeric';
        if (mobile.length !== 10) return 'Mobile must be exactly 10 digits';
        return '';
    }, [mobile]);

    const acreageError = useMemo(() => {
        if (acreage.length === 0) return '';
        const n = Number(acreage);
        if (!Number.isFinite(n)) return 'Acreage must be numeric';
        if (n <= 0) return 'Acreage must be > 0';
        return '';
    }, [acreage]);

    // PIN change + autofill logic
    const onPincodeChange = async (txt) => {
        const numeric = txt.replace(/[^0-9]/g, '');
        setPincode(numeric);
        setPinMsg('');

        // Until proper PIN code, keep locked + empty
        if (numeric.length < 6) {
            setLocationLocked(true);
            setStateName('');
            setDistrict('');
            setTaluka('');
            return;
        }

        // Only act at exactly 6 digits
        if (numeric.length === 6) {
            if (!/^\d{6}$/.test(numeric)) return;

            setPinLoading(true);
            try {
                const info = await fetchPincodeData(numeric); // should use India Post

                if (info) {
                    setStateName(info.state || '');
                    setDistrict(info.district || '');
                    setTaluka(info.taluka || '');
                    setLocationLocked(true); // keep disabled
                    setPinMsg('Location auto-filled from PIN');
                } else {
                    // PIN not found => allow manual entry
                    setStateName('');
                    setDistrict('');
                    setTaluka('');
                    setLocationLocked(false);
                    setPinMsg('PIN not found. Enter location manually.');
                }
            } catch (e) {
                // API error => allow manual entry
                setLocationLocked(false);
                setPinMsg('PIN API failed. Enter location manually.');
            } finally {
                setPinLoading(false);
            }
        }
    };

    const canGoStep2 = () => {
        if (pinError) return false;
        if (pincode.length !== 6) return false;
        if (!stateName.trim() || !district.trim()) return false;
        return true;
    };

    const canGoStep3 = () => {
        if (!farmerName.trim()) return false;
        if (mobileError) return false;
        if (!village.trim()) return false;
        if (!cropName.trim()) return false;
        if (acreageError) return false;
        if (!harvestingDate) return false;
        return true;
    };

    const submit = async () => {
        const ok = await requestLocationPermission();
        if (!ok) {
            Alert.alert('Permission required', 'Location permission is needed to calculate distance.');
            return;
        }

        let distanceKm = 0;
        try {
            const pos = await getCurrentPosition();
            const { latitude, longitude } = pos.coords;

            distanceKm = calculateDistanceKm(latitude, longitude, KALMESHWAR.lat, KALMESHWAR.lon);
        } catch (e) {
            Alert.alert('Location error', 'Could not fetch current location. Turn on GPS and try again.');
            return;
        }

        const farmer = {
            id: String(Date.now()),
            farmerName,
            mobileNumber: `${callingCode}${mobile}`,
            pincode,
            state: stateName,
            district,
            taluka,
            village,
            cropName,
            acreage: Number(acreage),
            harvestingDate: formatDate(harvestingDate),
            harvestingDateIso: harvestingDate.toISOString(),
            distanceKm: Number(distanceKm.toFixed(2)),
            createdAt: new Date().toISOString(),
        };

        await saveFarmerData(farmer);

        Alert.alert(
            'Saved',
            `Registered successfully.\nDistance: ${distanceKm.toFixed(2)} km`,
            [
                { text: 'View Farmers', onPress: () => navigation.navigate('RegisteredFarmers') },
                { text: 'Add Another', onPress: resetAll },
            ],
        );
    };

    const resetAll = () => {
        setStep(1);
        setPincode('');
        setStateName('');
        setDistrict('');
        setTaluka('');
        setLocationLocked(true);
        setPinMsg('');
        setFarmerName('');
        setMobile('');
        setVillage('');
        setCropName('');
        setAcreage('');
        setHarvestingDate(null);
    };

    return (
        <ScrollView style={styles.bg} contentContainerStyle={{ paddingBottom: 18 }}>
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>Farmer Registration</Text>
                <Text style={styles.heroSub}>
                    Distance will be calculated from your current location to Kalmeshwar APMC.
                </Text>
            </View>

            <View style={styles.card}>
                <View style={styles.stepRow}>
                    <StepChip label="1. Location" active={step === 1} />
                    <StepChip label="2. Details" active={step === 2} />
                    <StepChip label="3. Review" active={step === 3} />
                </View>

                {step === 1 && (
                    <>
                        <Text style={styles.sectionTitle}>Location (PIN first)</Text>

                        <Label text="PIN Code *" />
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                value={pincode}
                                onChangeText={onPincodeChange}
                                keyboardType="numeric"
                                maxLength={6}
                                placeholder="6-digit PIN"
                                placeholderTextColor="#7B8794"
                                style={[styles.input, pinError ? styles.inputError : null]}
                            />
                            {pinLoading ? <ActivityIndicator style={styles.loader} color="#1B5E20" /> : null}
                        </View>
                        {pinError ? <Hint type="error" text={pinError} /> : null}
                        {pinMsg ? <Hint type={pinMsg.includes('auto') ? 'ok' : 'warn'} text={pinMsg} /> : null}

                        <Label text="State *" />
                        <TextInput
                            value={stateName}
                            onChangeText={setStateName}
                            editable={!locationLocked}
                            placeholder="State"
                            placeholderTextColor="#7B8794"
                            style={[styles.input, locationLocked ? styles.inputDisabled : null]}
                        />

                        <Label text="District *" />
                        <TextInput
                            value={district}
                            onChangeText={setDistrict}
                            editable={!locationLocked}
                            placeholder="District"
                            placeholderTextColor="#7B8794"
                            style={[styles.input, locationLocked ? styles.inputDisabled : null]}
                        />

                        <Label text="Taluka" />
                        <TextInput
                            value={taluka}
                            onChangeText={setTaluka}
                            editable={!locationLocked}
                            placeholder="Taluka/Block"
                            placeholderTextColor="#7B8794"
                            style={[styles.input, locationLocked ? styles.inputDisabled : null]}
                        />

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={[styles.primaryBtn, !canGoStep2() && styles.btnDisabled]}
                                disabled={!canGoStep2()}
                                onPress={() => setStep(2)}>
                                <Text style={styles.primaryText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {step === 2 && (
                    <>
                        <Text style={styles.sectionTitle}>Farmer Details</Text>

                        <Label text="Farmer Name *" />
                        <TextInput
                            value={farmerName}
                            onChangeText={setFarmerName}
                            placeholder="Full name"
                            placeholderTextColor="#7B8794"
                            style={styles.input}
                        />

                        <Label text="Mobile Number *" />
                        <View style={styles.phoneRow}>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{callingCode}</Text>
                            </View>
                            <TextInput
                                value={mobile}
                                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                maxLength={10}
                                placeholder="10-digit number"
                                placeholderTextColor="#7B8794"
                                style={[styles.phoneInput, mobileError ? styles.inputError : null]}
                            />
                        </View>
                        {mobileError ? <Hint type="error" text={mobileError} /> : null}

                        <Label text="Village *" />
                        <TextInput
                            value={village}
                            onChangeText={setVillage}
                            placeholder="Village"
                            placeholderTextColor="#7B8794"
                            style={styles.input}
                        />

                        <Label text="Crop Name *" />
                        <TextInput
                            value={cropName}
                            onChangeText={setCropName}
                            placeholder="e.g., Cotton"
                            placeholderTextColor="#7B8794"
                            style={styles.input}
                        />

                        <Label text="Acreage (acres) *" />
                        <TextInput
                            value={acreage}
                            onChangeText={(t) => setAcreage(t.replace(/[^0-9.]/g, ''))}
                            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
                            placeholder="e.g., 5.5"
                            placeholderTextColor="#7B8794"
                            style={[styles.input, acreageError ? styles.inputError : null]}
                        />
                        {acreageError ? <Hint type="error" text={acreageError} /> : null}

                        <Label text="Harvesting Date *" />
                        <TouchableOpacity onPress={openHarvestDatePicker} activeOpacity={0.85}>
                            <View style={[styles.input, { justifyContent: 'center' }]}>
                                <Text style={{ color: harvestingDate ? '#111827' : '#7B8794', fontWeight: '800' }}>
                                    {harvestingDate ? formatDate(harvestingDate) : 'Select date'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                                <Text style={styles.secondaryText}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryBtn, !canGoStep3() && styles.btnDisabled]}
                                disabled={!canGoStep3()}
                                onPress={() => setStep(3)}>
                                <Text style={styles.primaryText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {step === 3 && (
                    <>
                        <Text style={styles.sectionTitle}>Review & Submit</Text>

                        <View style={styles.reviewCard}>
                            <ReviewLine k="Name" v={farmerName} />
                            <ReviewLine k="Mobile" v={`${callingCode}${mobile}`} />
                            <ReviewLine k="PIN" v={pincode} />
                            <ReviewLine k="State" v={stateName} />
                            <ReviewLine k="District" v={district} />
                            <ReviewLine k="Taluka" v={taluka || '-'} />
                            <ReviewLine k="Village" v={village} />
                            <ReviewLine k="Crop" v={cropName} />
                            <ReviewLine k="Acreage" v={acreage} />
                            <ReviewLine k="Harvesting" v={formatDate(harvestingDate)} />
                            <Text style={styles.reviewHint}>
                                Distance will be calculated from your current GPS location at submit.
                            </Text>
                        </View>

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                                <Text style={styles.secondaryText}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.primaryBtn} onPress={submit}>
                                <Text style={styles.primaryText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => navigation.navigate('RegisteredFarmers')}>
                    <Text style={styles.linkText}>View registered farmers →</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

function StepChip({ label, active }) {
    return (
        <View style={[styles.stepChip, active ? styles.stepActive : styles.stepIdle]}>
            <Text style={[styles.stepText, active ? styles.stepTextActive : styles.stepTextIdle]}>
                {label}
            </Text>
        </View>
    );
}

function Label({ text }) {
    return <Text style={styles.label}>{text}</Text>;
}

function Hint({ type, text }) {
    const style = type === 'error' ? styles.hintError : type === 'ok' ? styles.hintOk : styles.hintWarn;
    return <Text style={[styles.hint, style]}>{text}</Text>;
}

function ReviewLine({ k, v }) {
    return (
        <View style={styles.reviewLine}>
            <Text style={styles.reviewKey}>{k}</Text>
            <Text style={styles.reviewVal} numberOfLines={1}>{v}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#F3F6F9' },
    hero: {
        backgroundColor: '#1B5E20',
        padding: 18,
        paddingTop: 22,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    heroTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    heroSub: { color: '#D1FAE5', marginTop: 6, fontWeight: '600' },

    card: {
        backgroundColor: '#fff',
        margin: 14,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    stepRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    stepChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999 },
    stepActive: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
    stepIdle: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    stepText: { fontSize: 12, fontWeight: '800' },
    stepTextActive: { color: '#1B5E20' },
    stepTextIdle: { color: '#374151' },

    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
    label: { fontWeight: '800', color: '#111827', marginTop: 10, marginBottom: 6 },

    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: '#111827',
        fontWeight: '700',
    },
    inputDisabled: { backgroundColor: '#F1F5F9', color: '#4B5563' },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },

    loader: { position: 'absolute', right: 12, top: 12 },

    hint: { marginTop: 6, fontWeight: '700' },
    hintError: { color: '#B91C1C' },
    hintWarn: { color: '#B45309' },
    hintOk: { color: '#166534' },

    phoneRow: { flexDirection: 'row', alignItems: 'center' },
    codeBox: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#1B5E20',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    codeText: { color: '#fff', fontWeight: '900' },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: '#111827',
        fontWeight: '800',
    },

    btnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 16 },
    primaryBtn: {
        flex: 1,
        backgroundColor: '#1B5E20',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '900' },
    secondaryBtn: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    secondaryText: { color: '#111827', fontWeight: '900' },
    btnDisabled: { opacity: 0.5 },

    linkBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
    linkText: { color: '#1B5E20', fontWeight: '900' },

    reviewCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 12,
    },
    reviewLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    reviewKey: { color: '#374151', fontWeight: '800' },
    reviewVal: { color: '#111827', fontWeight: '900', maxWidth: '60%' },
    reviewHint: { marginTop: 12, color: '#065F46', fontWeight: '800' },
});
