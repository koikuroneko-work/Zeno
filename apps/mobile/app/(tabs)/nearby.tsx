import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, RefreshControl, Alert, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/design/tokens';
import * as Location from 'expo-location';
import { useSettingsStore } from '@/store/settingsStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useLocationPermission } from '@/services/permissionService';
import MapView from '@/components/MapView';
import { fetchNearbyPlaces, NearbyPlace, calculateAffordability } from '@/services/nearbyPlacesService';
import { getExchangeRate } from '@/services/exchangeRateService';

/** Rough distance in meters between two lat/lng points (fast, no trig). */
function roughMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = (lat2 - lat1) * 111_320;
  const dLng = (lng2 - lng1) * 111_320 * Math.cos((lat1 + lat2) / 2 * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export default function NearbyScreen() {
  const { t } = useTranslation();
  const nearbyEnabled = useSettingsStore(s => s.nearbyEnabled);
  const { status, requestPermission, openAppSettings, isGranted, checkPermission } =
    useLocationPermission();
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [sortBy, setSortBy] = useState<'nearest' | 'cheapest'>('nearest');

  // Ref to skip re-fetching OSM if we just fetched (rate-limit to 2 min)
  const lastFetchMs = useRef(0);
  const currency = useSettingsStore(s => s.currency);

  // Live exchange rate: USD → user's currency (1 = same as USD)
  const [exchangeRate, setExchangeRate] = useState(1);
  useEffect(() => {
    getExchangeRate(currency).then(setExchangeRate);
  }, [currency]);

  const transactions = useTransactionStore(s => s.transactions);

  // ── Monthly financial context ──────────────────────────────────────────
  const { dailyDisposable, monthlyRemaining, isOverBudget, daysLeft } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last day of current month (0 = go back one day from next month)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, lastDay - now.getDate() + 1);

    let income = 0;
    let expenses = 0;
    for (const tr of transactions) {
      if (new Date(tr.occurredAt) < monthStart) continue;
      if (tr.type === 'income') income += Math.abs(tr.amountMinor);
      else if (tr.type === 'expense') expenses += Math.abs(tr.amountMinor);
    }

    const remaining = income - expenses;
    return {
      dailyDisposable: remaining > 0 ? Math.round(remaining / daysLeft) : 0,
      monthlyRemaining: remaining,
      isOverBudget: remaining <= 0,
      daysLeft,
    };
  }, [transactions]);

  // ── Affordability-computed places ──────────────────────────────────────
  const placesWithAffordability = useMemo(
    () => places.map(p => {
      // Convert USD base cost to user's local currency via live exchange rate
      const localMinCost = p.categoryMinCost * exchangeRate;
      const { level, score } = calculateAffordability(localMinCost, dailyDisposable);
      return { ...p, affordability: level, affordabilityScore: score };
    }),
    [places, dailyDisposable, exchangeRate],
  );

  // Memoize map places to prevent WebView full reload on every render
  // IMPORTANT: must be called before any early returns to keep hook order stable
  const mapPlaces = useMemo(
    () => placesWithAffordability.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      name: p.name,
      estimatedCost: p.hasRealPrice ? p.estimatedCost ?? undefined : undefined,
    })),
    [placesWithAffordability],
  );

  // Sort places based on user preference
  const sortedPlaces = useMemo(() => {
    const copy = [...placesWithAffordability];
    if (sortBy === 'nearest') {
      copy.sort((a, b) => a.distance - b.distance);
    } else {
      copy.sort((a, b) => {
        const diff = a.affordabilityScore - b.affordabilityScore;
        if (diff !== 0) return diff;
        return a.distance - b.distance;
      });
    }
    return copy;
  }, [placesWithAffordability, sortBy]);

  // ── Smart pick: best suggestion ────────────────────────────────────────
  const bestPick = useMemo((): NearbyPlace | null => {
    if (!sortedPlaces.length) return null;
    // Prefer Safe places, then Medium, then cheapest of any
    for (const level of ['safe', 'medium'] as const) {
      const candidates = sortedPlaces
        .filter(p => p.affordability === level)
        .sort((a, b) => a.distance - b.distance);
      if (candidates.length > 0) return candidates[0];
    }
    // Fallback: cheapest overall (lowest affordabilityScore)
    return [...sortedPlaces].sort((a, b) => a.affordabilityScore - b.affordabilityScore)[0];
  }, [sortedPlaces]);

  // ── Fetch places from OSM ─────────────────────────────────────────────
  const fetchPlaces = async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastFetchMs.current < 120_000) return; // cached
    lastFetchMs.current = now;
    const currency = useSettingsStore.getState().currency || 'MYR';
    const { places: fetched } = await fetchNearbyPlaces(lat, lng, 500, currency);
    setPlaces(fetched);
  };

  const fetchLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isGranted()) {
        const newStatus = await requestPermission();
        if (newStatus !== 'granted') {
          checkPermission();
          setError(t('nearby.errors.permissionDenied'));
          return;
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      lastFetchMs.current = 0; // force fresh fetch
      await fetchPlaces(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (err) {
      setError(t('nearby.errors.fetchLocation', { message: String(err) }));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (status === 'granted' && nearbyEnabled) {
      Location.getLastKnownPositionAsync({ maxAge: 60_000 }).then(pos => {
        if (pos) {
          setLocation(pos.coords);
          fetchPlaces(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        }
      }).catch(() => {});
      fetchLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, nearbyEnabled]);

  // Periodic location refresh (30 s)
  useEffect(() => {
    if (status !== 'granted' || !nearbyEnabled) return;

    const interval = setInterval(async () => {
      try {
        const newPos = await Location.getCurrentPositionAsync({});
        if (!location) {
          setLocation(newPos.coords);
          return;
        }
        const moved = roughMeters(
          location.latitude, location.longitude,
          newPos.coords.latitude, newPos.coords.longitude,
        );
        setLocation(newPos.coords);
        if (moved > 50) {
          lastFetchMs.current = 0;
          await fetchPlaces(newPos.coords.latitude, newPos.coords.longitude);
        }
      } catch { /* GPS unavailable briefly — ignore */ }
    }, 30_000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, nearbyEnabled, location?.latitude, location?.longitude]);

  // ── Tag helpers ────────────────────────────────────────────────────────
  const affordabilityConfig: Record<string, { label: string; color: string; bg: string }> = {
    safe:   { label: t('nearby.affordableSafe'),   color: '#2E7D32', bg: '#E8F5E9' },
    medium: { label: t('nearby.affordableMedium'), color: '#E65100', bg: '#FFF3E0' },
    danger: { label: t('nearby.affordableDanger'), color: '#C62828', bg: '#FFEBEE' },
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (!nearbyEnabled) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: colors.inkLight, textAlign: 'center', marginBottom: 16 }}>
          {t('nearby.requestPermission')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center', marginBottom: 24 }}>
          {t('nearby.featureDisabledHint')}
        </Text>
      </View>
    );
  }

  if (status !== 'granted') {
    const isDeniedForever = status === 'deniedForever';
    const showSettings = isDeniedForever;
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: colors.inkLight, textAlign: 'center', marginBottom: 16 }}>
          {t('nearby.permissionTitle')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center', marginBottom: 24 }}>
          {isDeniedForever ? t('nearby.permissionDeniedForever') : t('nearby.permissionBody')}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.coral,
            paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 16,
          }}
          onPress={async () => {
            if (showSettings) { await openAppSettings(); return; }
            await requestPermission();
            checkPermission();
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: '600' }}>
            {showSettings ? t('nearby.openSettings') : t('nearby.allow')}
          </Text>
        </TouchableOpacity>
        {!showSettings && (
          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => {}}>
            <Text style={{ color: colors.inkLight }}>{t('nearby.deny')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (location) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 24 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLocation} />}
          >
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginBottom: 24 }}>
              {t('nearby.title')}
            </Text>
            <Text style={{ fontSize: 16, color: colors.inkLight, marginBottom: 24 }}>
              {t('nearby.subtitle')}
            </Text>

            {/* Monthly remaining summary */}
            <View style={{
              backgroundColor: isOverBudget ? '#FFF3E0' : '#E8F5E9',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isOverBudget ? '#E65100' : '#2E7D32' }}>
                {isOverBudget
                  ? t('nearby.overBudget', { amount: Math.abs(monthlyRemaining) / 100 })
                  : t('nearby.monthlyRemaining', { amount: monthlyRemaining / 100, days: daysLeft })}
              </Text>
            </View>

            {/* Map */}
            <MapView
              userLocation={{
                latitude: location.latitude, longitude: location.longitude, name: 'You',
              }}
              places={mapPlaces}
              height={280}
            />

            {/* Open in external maps */}
            <TouchableOpacity
              onPress={() => {
                const url = Platform.OS === 'ios'
                  ? `maps://?q=${location.latitude},${location.longitude}`
                  : `geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}`;
                Linking.openURL(url).catch(() => Alert.alert(t('nearby.mapOpenError')));
              }}
              style={{
                backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 12,
                marginTop: 12, marginBottom: 24, alignItems: 'center',
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.ink }}>{t('nearby.openInMaps')}</Text>
            </TouchableOpacity>

            {/* Smart pick suggestion */}
            {bestPick && !loading && places.length > 0 && !isOverBudget && (
              <View style={{
                backgroundColor: '#F3E5F5',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#7B1FA2',
              }}>
                <Text style={{ fontSize: 14, color: '#6A1B9A', marginBottom: 4, fontWeight: '600' }}>
                  {t('nearby.suggestion')}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>
                  {bestPick.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.inkLight, marginTop: 2 }}>
                  {t(`transactions.${bestPick.category}`) || bestPick.category}
                  {' · '}{t('nearby.distance', { meters: bestPick.distance })}
                  {' · '}{affordabilityConfig[bestPick.affordability].label}
                </Text>
              </View>
            )}

            {loading && !places.length ? (
              <View style={{ padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.coral} />
                <Text style={{ marginTop: 16, color: colors.ink }}>{t('nearby.loading')}</Text>
              </View>
            ) : error ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity
                  style={{
                    marginTop: 16, backgroundColor: colors.coral,
                    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8,
                  }}
                  onPress={fetchLocation}
                >
                  <Text style={{ color: colors.surface, fontWeight: '600' }}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : places.length > 0 ? (
              <>
                {/* Sort toggle — compact pill layout */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 }}>
                  <Text style={{ fontSize: 14, color: colors.inkLight, marginRight: 2 }}>
                    {t('nearby.sortLabel')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSortBy('nearest')}
                    style={{
                      paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14,
                      backgroundColor: sortBy === 'nearest' ? colors.coral : colors.surfaceAlt,
                      borderWidth: 1, borderColor: sortBy === 'nearest' ? colors.coral : colors.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: '600',
                      color: sortBy === 'nearest' ? colors.surface : colors.ink,
                    }}>
                      {t('nearby.sortNearest')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSortBy('cheapest')}
                    style={{
                      paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14,
                      backgroundColor: sortBy === 'cheapest' ? colors.coral : colors.surfaceAlt,
                      borderWidth: 1, borderColor: sortBy === 'cheapest' ? colors.coral : colors.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 13, fontWeight: '600',
                      color: sortBy === 'cheapest' ? colors.surface : colors.ink,
                    }}>
                      {t('nearby.sortCheapest')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Place list */}
                {sortedPlaces.map((item) => {
                  const cfg = affordabilityConfig[item.affordability];
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        const priceLine = item.hasRealPrice && item.estimatedCost
                          ? `${t('nearby.costLabel', { cost: item.estimatedCost })}\n`
                          : '';
                        Alert.alert(
                          item.name,
                          `${t(`transactions.${item.category}`) || item.category}\n` +
                          `${t('nearby.distance', { meters: item.distance })}${priceLine ? ` · ${priceLine}` : '\n'}` +
                          `${t('nearby.affordanceLabel')} ${cfg.label}`,
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            { text: t('nearby.openInMaps'), onPress: () => {
                              const url = Platform.OS === 'ios'
                                ? `maps://?q=${encodeURIComponent(item.name)}@${item.latitude},${item.longitude}`
                                : `geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}(${encodeURIComponent(item.name)})`;
                              Linking.openURL(url).catch(() => Alert.alert(t('nearby.mapOpenError')));
                            }},
                          ]
                        );
                      }}
                      style={{
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: 12, padding: 16, marginVertical: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>
                            {item.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.inkLight, marginTop: 2 }}>
                            {t(`transactions.${item.category}`) || item.category}
                            {' · '}{t('nearby.distance', { meters: item.distance })}
                            {item.hasRealPrice && item.estimatedCost && (
                              <Text style={{ color: colors.success }}> · {item.estimatedCost}</Text>
                            )}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: cfg.bg,
                          borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10,
                        }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.color }}>
                            {cfg.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              !loading && (
                <View style={{
                  backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 24,
                  marginTop: 24, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 16, color: colors.inkLight, textAlign: 'center', marginBottom: 8 }}>
                    {t('nearby.noPlacesFound')}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.inkLight, textAlign: 'center' }}>
                    {t('nearby.expandSearch')}
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Initial fetch in progress
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.coral} />
      <Text style={{ marginTop: 16, color: colors.ink }}>{t('nearby.fetchingLocation')}</Text>
    </View>
  );
}
