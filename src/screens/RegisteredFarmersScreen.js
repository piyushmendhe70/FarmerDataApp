import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Pressable,
} from 'react-native';
import { getAllFarmers } from '../services/storageService';

const RegisteredFarmersScreen = ({ navigation }) => {
    const [farmers, setFarmers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // UI states
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt' | 'distance' | 'name'
    const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

    // Details modal
    const [selected, setSelected] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const loadFarmers = useCallback(async () => {
        const data = await getAllFarmers();
        setFarmers(Array.isArray(data) ? data : []);
    }, []);

    useEffect(() => {
        loadFarmers();
        const unsub = navigation.addListener('focus', loadFarmers);
        return unsub;
    }, [navigation, loadFarmers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFarmers();
        setRefreshing(false);
    }, [loadFarmers]);

    // Helpers to support both old/new saved keys
    const getDistance = (f) => {
        const v = f?.distanceKm ?? f?.distance;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const getCreated = (f) => f?.createdAt ?? f?.timestamp ?? '';

    const stats = useMemo(() => {
        const total = farmers.length;
        const d = farmers.map(getDistance).filter((n) => Number.isFinite(n));
        const avgDistance = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
        return { total, avgDistance };
    }, [farmers]);

    const filteredSorted = useMemo(() => {
        const q = query.trim().toLowerCase();

        const filtered = q
            ? farmers.filter((f) => {
                const name = String(f.farmerName || '').toLowerCase();
                const mobile = String(f.mobileNumber || '').toLowerCase();
                const village = String(f.village || '').toLowerCase();
                const crop = String(f.cropName || '').toLowerCase();
                return (
                    name.includes(q) ||
                    mobile.includes(q) ||
                    village.includes(q) ||
                    crop.includes(q)
                );
            })
            : farmers;

        const dir = sortDir === 'asc' ? 1 : -1;

        return [...filtered].sort((a, b) => {
            if (sortBy === 'distance') {
                const da = getDistance(a);
                const db = getDistance(b);
                if (da == null && db == null) return 0;
                if (da == null) return 1;
                if (db == null) return -1;
                return (da - db) * dir;
            }

            if (sortBy === 'name') {
                return (
                    String(a.farmerName || '').localeCompare(String(b.farmerName || '')) *
                    dir
                );
            }

            // createdAt default (string compare works with ISO)
            return String(getCreated(a)).localeCompare(String(getCreated(b))) * dir;
        });
    }, [farmers, query, sortBy, sortDir]);

    // IMPORTANT:
    // - Top dashboard goes in ListHeaderComponent (scrolls)
    // - Table header stays as first data item (sticky)
    const listData = useMemo(
        () => [{ type: 'TABLE_HEADER', id: '__table_header__' }, ...filteredSorted],
        [filteredSorted],
    );

    const toggleSort = (key) => {
        if (sortBy !== key) {
            setSortBy(key);
            setSortDir('asc');
            return;
        }
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    };

    const openDetails = (farmer) => {
        setSelected(farmer);
        setDetailsOpen(true);
    };

    const Badge = ({ label }) => (
        <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );

    const TopDashboard = () => (
        <View style={styles.topCard}>
            <Text style={styles.title}>Registered Farmers</Text>

            <View style={styles.kpiRow}>
                <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>Total</Text>
                    <Text style={styles.kpiValue}>{stats.total}</Text>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>Avg distance</Text>
                    <Text style={styles.kpiValue}>{stats.avgDistance.toFixed(2)} km</Text>
                </View>
            </View>

            <View style={styles.searchRow}>
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search name / mobile / village / crop"
                    placeholderTextColor="#7B8794"
                    style={styles.searchInput}
                />

                <TouchableOpacity
                    style={styles.sortPill}
                    onPress={() => toggleSort('createdAt')}>
                    <Text style={styles.sortPillText}>
                        Sort: {sortBy === 'createdAt' ? 'Recent' : sortBy}{' '}
                        {sortDir === 'asc' ? '↑' : '↓'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />
        </View>
    );

    const TableHeaderRow = () => (
        <View style={styles.tableHeader}>
            <Pressable
                style={[styles.hcell, styles.cName]}
                onPress={() => toggleSort('name')}>
                <Text style={styles.htext}>
                    Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </Text>
            </Pressable>

            <View style={[styles.hcell, styles.cMobile]}>
                <Text style={styles.htext}>Mobile</Text>
            </View>

            <View style={[styles.hcell, styles.cVillage]}>
                <Text style={styles.htext}>Village</Text>
            </View>

            <View style={[styles.hcell, styles.cCrop]}>
                <Text style={styles.htext}>Crop</Text>
            </View>

            <View style={[styles.hcell, styles.cAcreage]}>
                <Text style={[styles.htext, styles.right]}>Acres</Text>
            </View>

            <Pressable
                style={[styles.hcell, styles.cDistance]}
                onPress={() => toggleSort('distance')}>
                <Text style={[styles.htext, styles.right]}>
                    Dist {sortBy === 'distance' ? (sortDir === 'asc' ? '↑' : '↓') : ''}{' '}
                    (km)
                </Text>
            </Pressable>
        </View>
    );

    const Row = ({ item, index }) => {
        const alt = index % 2 === 0;
        const d = getDistance(item);

        return (
            <Pressable
                onPress={() => openDetails(item)}
                style={[styles.rowCard, alt && styles.rowAlt]}>
                <View style={[styles.cell, styles.cName]}>
                    <Text style={styles.nameText} numberOfLines={1}>
                        {item.farmerName || '-'}
                    </Text>
                    <Text style={styles.subText} numberOfLines={1}>
                        {item.state ? `${item.state}` : ''}
                        {item.district ? ` • ${item.district}` : ''}
                    </Text>
                </View>

                <View style={[styles.cell, styles.cMobile]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                        {item.mobileNumber || '-'}
                    </Text>
                    <Text style={styles.subText} numberOfLines={1}>
                        Tap for details
                    </Text>
                </View>

                <View style={[styles.cell, styles.cVillage]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                        {item.village || '-'}
                    </Text>
                </View>

                <View style={[styles.cell, styles.cCrop]}>
                    {item.cropName ? <Badge label={item.cropName} /> : <Text style={styles.cellText}>-</Text>}
                </View>

                <View style={[styles.cell, styles.cAcreage]}>
                    <Text style={[styles.cellText, styles.right]}>
                        {Number.isFinite(Number(item.acreage)) ? item.acreage : '-'}
                    </Text>
                </View>

                <View style={[styles.cell, styles.cDistance]}>
                    <Text style={[styles.distanceText, styles.right]}>
                        {d == null ? '-' : d.toFixed(2)}
                    </Text>
                </View>
            </Pressable>
        );
    };

    const renderItem = ({ item, index }) => {
        if (item.type === 'TABLE_HEADER') return <TableHeaderRow />;
        return <Row item={item} index={index} />;
    };

    const Empty = () => (
        <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No farmers registered yet</Text>
            <Text style={styles.emptySub}>Add your first farmer to see them listed here.</Text>
            <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('FarmerRegistration')}>
                <Text style={styles.primaryBtnText}>+ Add Farmer</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.screen}>
            <FlatList
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item, idx) => (item?.id ? String(item.id) : String(idx))}
                ListHeaderComponent={<TopDashboard />}
                stickyHeaderIndices={[1]} // 0 is ListHeaderComponent, 1 is TABLE_HEADER item
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={<Empty />}
                contentContainerStyle={styles.listContent}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('FarmerRegistration')}>
                <Text style={styles.fabPlus}>+</Text>
            </TouchableOpacity>

            <Modal
                visible={detailsOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setDetailsOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setDetailsOpen(false)}>
                    <Pressable style={styles.modalCard} onPress={() => { }}>
                        <Text style={styles.modalTitle}>
                            {selected?.farmerName || 'Farmer Details'}
                        </Text>
                        <Text style={styles.modalLine}>Mobile: {selected?.mobileNumber || '-'}</Text>
                        <Text style={styles.modalLine}>PIN: {selected?.pincode || '-'}</Text>
                        <Text style={styles.modalLine}>State: {selected?.state || '-'}</Text>
                        <Text style={styles.modalLine}>District: {selected?.district || '-'}</Text>
                        <Text style={styles.modalLine}>Taluka: {selected?.taluka || '-'}</Text>
                        <Text style={styles.modalLine}>Village: {selected?.village || '-'}</Text>
                        <Text style={styles.modalLine}>Crop: {selected?.cropName || '-'}</Text>
                        <Text style={styles.modalLine}>Acreage: {selected?.acreage ?? '-'}</Text>
                        <Text style={styles.modalLine}>Harvesting: {selected?.harvestingDate || '-'}</Text>
                        <Text style={styles.modalLine}>
                            Distance: {(getDistance(selected) ?? '-')} km
                        </Text>

                        <TouchableOpacity style={styles.modalBtn} onPress={() => setDetailsOpen(false)}>
                            <Text style={styles.modalBtnText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const COLORS = {
    bg: '#F6F8FB',
    card: '#FFFFFF',
    text: '#111827',
    sub: '#6B7280',
    green: '#2E7D32',
    green2: '#43A047',
    border: '#E5E7EB',
    rowAlt: '#FBFCFE',
    badgeBg: '#E8F5E9',
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },

    topCard: {
        backgroundColor: COLORS.card,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    divider: { marginTop: 12, height: 1, backgroundColor: COLORS.border },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.text },

    kpiRow: {
        flexDirection: 'row',
        marginTop: 12,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        borderRadius: 12,
        padding: 12,
    },
    kpi: { flex: 1 },
    kpiDivider: { width: 1, backgroundColor: '#DCFCE7', marginHorizontal: 12 },
    kpiLabel: { fontSize: 12, color: COLORS.sub, fontWeight: '700' },
    kpiValue: { marginTop: 4, fontSize: 18, fontWeight: '900', color: COLORS.green },

    searchRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: COLORS.text,
        backgroundColor: '#F9FAFB',
    },
    sortPill: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    sortPillText: { fontSize: 12, fontWeight: '800', color: COLORS.green2 },

    listContent: { padding: 12, paddingBottom: 110 },

    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.green,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1B5E20',
        marginBottom: 10,
    },
    hcell: { paddingVertical: 12, paddingHorizontal: 10 },
    htext: { color: '#fff', fontSize: 12, fontWeight: '900' },
    right: { textAlign: 'right' },

    rowCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 12,
        marginBottom: 10,
    },
    rowAlt: { backgroundColor: COLORS.rowAlt },
    cell: { paddingHorizontal: 10 },
    cellText: { fontSize: 12, color: COLORS.text, fontWeight: '700' },
    nameText: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
    subText: { marginTop: 2, fontSize: 11, color: COLORS.sub, fontWeight: '600' },
    distanceText: { fontSize: 13, color: COLORS.green, fontWeight: '900' },

    badge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.badgeBg,
        borderWidth: 1,
        borderColor: '#C8E6C9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: { fontSize: 11, color: COLORS.green, fontWeight: '900' },

    // column widths
    cName: { flex: 2.2 },
    cMobile: { flex: 1.7 },
    cVillage: { flex: 1.6 },
    cCrop: { flex: 1.4 },
    cAcreage: { flex: 1.0 },
    cDistance: { flex: 1.2 },

    emptyWrap: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 30,
    },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
    emptySub: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.sub,
        textAlign: 'center',
    },
    primaryBtn: {
        marginTop: 14,
        backgroundColor: COLORS.green,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '900' },

    fab: {
        position: 'absolute',
        right: 18,
        bottom: 18,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: COLORS.green,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },
    fabPlus: { color: '#fff', fontSize: 28, fontWeight: '800' },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(17,24,39,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },
    modalCard: {
        width: '100%',
        maxWidth: 520,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
    },
    modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginBottom: 10 },
    modalLine: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 6 },
    modalBtn: {
        marginTop: 14,
        alignSelf: 'flex-end',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    modalBtnText: { fontSize: 12, fontWeight: '900', color: COLORS.text },
});

export default RegisteredFarmersScreen;
