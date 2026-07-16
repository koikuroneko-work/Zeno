import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, SafeAreaView, StatusBar, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { colors } from '@/design/tokens';
import { useTransactionStore } from '@/store/transactionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/utils/currencyFormatter';
import { DailyChallengeCard } from '@/features/dailyChallenge/components/DailyChallengeCard';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from '@/components/DateTimePickerModal';

interface HomeNote {
  id: string;
  text: string;
  reminderTime: string | null; // ISO string
  notificationId: string | null;
  createdAt: string; // ISO string
}

let noteIdCounter = 0;
function genId(): string {
  noteIdCounter += 1;
  return `note_${Date.now()}_${noteIdCounter}`;
}

const NOTES_STORAGE_KEY = 'homeNotes';

function formatDateTime(date: Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleString(locale, options);
}

function formatTimeShort(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

// WMO weather code → emoji mapping (codes: https://open-meteo.com/en/docs)
const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  56: '🌧️', 57: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};


// ─── Extracted lightweight DateTime+Weather card ───────────────────────
// Lives in its own component so the 60s clock tick doesn't re-render
// the entire home screen (notes, insights, dashboard).
const DateTimeWeatherCard = memo(function DateTimeWeatherCard() {
  const { i18n } = useTranslation();
  const [dateTime, setDateTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temperature: number; code: number; loading: boolean }>(
    { temperature: 0, code: 0, loading: true },
  );

  // Tick every 60s — only this component re-renders
  useEffect(() => {
    const id = setInterval(() => setDateTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch weather once on mount using GPS (if permission granted)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (!cancelled) setWeather(w => ({ ...w, loading: false }));
          return;
        }
        // Bound the GPS fix — getCurrentPositionAsync has no built-in timeout and
        // can hang on a cold start. Prefer a cached last-known position for speed,
        // then race a fresh fix against a hard timeout.
        const pos =
          (await Location.getLastKnownPositionAsync({ maxAge: 600_000 })) ??
          (await Promise.race<Location.LocationObject>([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            new Promise<Location.LocationObject>((_, reject) =>
              setTimeout(() => reject(new Error('gps-timeout')), 8000),
            ),
          ]));
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true&timezone=auto`,
          { headers: { 'User-Agent': 'Zeno/0.1' } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cw = data.current_weather;
        if (!cancelled) {
          setWeather({ temperature: Math.round(cw.temperature), code: cw.weathercode, loading: false });
        }
      } catch {
        if (!cancelled) setWeather(w => ({ ...w, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={{
      backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 16,
      marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>
          {formatDateTime(dateTime, i18n.language)}
        </Text>
      </View>
      <View>
        <Text style={{ fontSize: 16, color: colors.ink }}>
          {weather.loading ? '...' : `${WMO_EMOJI[weather.code] || '☀️'} ${weather.temperature}°C`}
        </Text>
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const transactions = useTransactionStore(s => s.transactions);
  const { currency, reminderEnabled } = useSettingsStore();

  // Memoize totals — only recalculate when transactions change
  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amountMinor, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amountMinor), 0),
    [transactions],
  );
  const net = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  // Notes state
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editReminderTime, setEditReminderTime] = useState<Date | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<string | null>(null);

  // Debounce timer ref for persisting notes to AsyncStorage
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes from AsyncStorage once on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
        if (raw) {
          const parsed: HomeNote[] = JSON.parse(raw);
          setNotes(parsed);
        }
      } catch (err) {
        console.warn('Failed to load notes:', err);
      } finally {
        setNotesLoaded(true);
      }
    })();
  }, []);

  // Persist notes — debounced so rapid edits don't write AsyncStorage every keystroke
  const persistNotes = useCallback((updated: HomeNote[]) => {
    setNotes(updated);
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save notes:', err);
      }
    }, 300);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  // Schedule a notification for a note
  const scheduleNotification = async (
    noteId: string,
    body: string,
    triggerDate: Date,
  ): Promise<string | null> => {
    if (!reminderEnabled) return null;

    // Check if we already have permission — don't prompt again here.
    // The onboarding screen handles the initial permission request.
    // This avoids a double-prompt issue on Android where re-requesting
    // can silently fail if the user declined once.
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== Notifications.PermissionStatus.GRANTED) {
      // Try requesting (may show dialog on first call, silently returns denied
      // on subsequent calls on Android 13+)
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== Notifications.PermissionStatus.GRANTED) {
        console.warn('Notification permission not granted — cannot schedule reminder');
        return null;
      }
    }

    try {
      // Fire at exactly the 00-second mark of the chosen minute
      const preciseDate = new Date(triggerDate);
      preciseDate.setSeconds(0, 0);

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: preciseDate,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Zeno Reminder',
          body: body || 'You have a note set!',
          data: { noteId },
        },
        trigger,
      });
      return notificationId;
    } catch (err) {
      console.warn('Failed to schedule notification:', err);
      return null;
    }
  };

  // Cancel a notification
  const cancelNotification = async (notificationId: string | null) => {
    if (notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (err) {
        console.warn('Failed to cancel notification:', err);
      }
    }
  };

  // Start editing a note
  const startEdit = (note: HomeNote) => {
    setEditingId(note.id);
    setEditText(note.text);
    setEditReminderTime(note.reminderTime ? new Date(note.reminderTime) : null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditReminderTime(null);
  };

  // Save a note
  const saveNote = async (noteId: string) => {
    setSavingId(noteId);
    try {
      const existing = notes.find(n => n.id === noteId);
      if (!existing) return;

      // Cancel old notification if it existed
      if (existing.notificationId) {
        await cancelNotification(existing.notificationId);
      }

      // Schedule new notification if reminder is set
      let newNotificationId: string | null = null;
      if (editReminderTime && editReminderTime.getTime() > Date.now()) {
        newNotificationId = await scheduleNotification(noteId, editText, editReminderTime);
      }

      const updated = notes.map(n =>
        n.id === noteId
          ? {
              ...n,
              text: editText,
              reminderTime: editReminderTime ? editReminderTime.toISOString() : null,
              notificationId: newNotificationId,
            }
          : n,
      );
      persistNotes(updated);
      setEditingId(null);
    } catch (err) {
      console.warn('Failed to save note:', err);
    } finally {
      setSavingId(null);
    }
  };

  // Delete a note
  const deleteNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setDeletingId(noteId);
    try {
      if (note.notificationId) {
        await cancelNotification(note.notificationId);
      }
      const updated = notes.filter(n => n.id !== noteId);
      persistNotes(updated);
      if (editingId === noteId) {
        setEditingId(null);
        setEditText('');
        setEditReminderTime(null);
      }
    } catch (err) {
      console.warn('Failed to delete note:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Add a new empty note
  const addNote = () => {
    const newNote: HomeNote = {
      id: genId(),
      text: '',
      reminderTime: null,
      notificationId: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [...notes, newNote];
    persistNotes(updated);
    // Start editing the new note immediately
    startEdit(newNote);
  };

  // Handle time picker confirm
  const handleDatePicked = (date: Date) => {
    if (datePickerTarget) {
      setEditReminderTime(date);
    }
    setShowDatePicker(false);
    setDatePickerTarget(null);
  };

  if (!notesLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink }}>
          {t('home.title')}
        </Text>
        <Text style={{ marginTop: 12, color: colors.inkLight }}>
          {t('home.subtitle')}
        </Text>

        {/* Date, Time, and Weather — isolated component, clock ticks don't re-render rest of page */}
        <DateTimeWeatherCard />

        {/* Dashboard Card */}
        <View style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }}>
              {t('dashboard.overview')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, color: colors.inkLight }}>{t('dashboard.income')}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.mint }}>
              +{formatCurrency(totalIncome, currency)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 16, color: colors.inkLight }}>{t('dashboard.expenses')}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.coral }}>
              -{formatCurrency(totalExpense, currency)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 16, color: colors.inkLight }}>{t('dashboard.remaining')}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: net >= 0 ? colors.mint : colors.coral }}>
              {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net), currency)}
            </Text>
          </View>
        </View>

        {/* Notes Section — multi-note */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }}>
              {t('dashboard.today')}
            </Text>
            <TouchableOpacity
              onPress={addNote}
              style={{
                backgroundColor: colors.coral,
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '700', fontSize: 14 }}>+ {t('home.addNote')}</Text>
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <View style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 8,
              padding: 16,
              minHeight: 80,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 16, color: colors.inkLight }}>
                {t('dashboard.notePlaceholder')}
              </Text>
            </View>
          ) : (
            notes.map((note) => {
              const isEditing = editingId === note.id;
              const isSaving = savingId === note.id;
              const isDeleting = deletingId === note.id;

              return (
                <View
                  key={note.id}
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isEditing ? (
                    /* Edit mode */
                    <View>
                      <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        placeholder={t('dashboard.notePlaceholder')}
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 4,
                          padding: 12,
                          marginBottom: 8,
                          fontSize: 16,
                          maxHeight: 100,
                          minHeight: 60,
                        }}
                        multiline
                        autoFocus
                      />

                      {/* Reminder row */}
                      <TouchableOpacity
                        onPress={() => {
                          setDatePickerTarget(note.id);
                          setShowDatePicker(true);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: colors.inkLight, marginRight: 8 }}>
                          🔔 {t('dashboard.reminder')}:
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.coral, textDecorationLine: 'underline' }}>
                          {editReminderTime ? formatTimeShort(editReminderTime, i18n.language) : t('dashboard.setReminder')}
                        </Text>
                        {editReminderTime && (
                          <TouchableOpacity
                            onPress={() => setEditReminderTime(null)}
                            style={{ marginLeft: 8 }}
                          >
                            <Text style={{ fontSize: 14, color: colors.danger }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>

                      {/* Action buttons */}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => deleteNote(note.id)}
                          disabled={isDeleting}
                          style={{
                            backgroundColor: colors.surface,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: colors.danger,
                          }}
                        >
                          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
                            {isDeleting ? '...' : t('common.delete')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={cancelEdit}
                          disabled={isSaving}
                          style={{
                            backgroundColor: colors.inkLight,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: colors.surface, fontWeight: '600', fontSize: 13 }}>
                            {t('common.cancel')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => saveNote(note.id)}
                          disabled={isSaving}
                          style={{
                            backgroundColor: colors.coral,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 4,
                            opacity: isSaving ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: colors.surface, fontWeight: '600', fontSize: 13 }}>
                            {isSaving ? t('common.saving') : t('common.save')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* Display mode */
                    <View>
                      {/* Delete button (top-right) */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <TouchableOpacity
                          onPress={() => startEdit(note)}
                          style={{ flex: 1 }}
                        >
                          <Text style={{ fontSize: 16, color: colors.ink }}>{note.text}</Text>
                          {note.reminderTime && (
                            <Text style={{ fontSize: 12, color: colors.inkLight, marginTop: 4 }}>
                              🔔 {formatTimeShort(new Date(note.reminderTime), i18n.language)}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              t('common.confirm'),
                              t('transactions.deleteConfirm'),
                              [
                                { text: t('common.cancel'), style: 'cancel' },
                                { text: t('common.delete'), style: 'destructive', onPress: () => deleteNote(note.id) },
                              ],
                            );
                          }}
                          style={{ padding: 4, marginLeft: 8 }}
                        >
                          <Text style={{ fontSize: 18, color: colors.inkLight }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Daily Challenge Card — replaces the old Insights section */}
        <DailyChallengeCard />

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date/Time Picker Modal */}
      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => {
          setShowDatePicker(false);
          setDatePickerTarget(null);
        }}
        onConfirm={handleDatePicked}
        initialDate={editReminderTime || undefined}
        labels={{
          title: t('datePicker.title'),
          today: t('datePicker.today'),
          tomorrow: t('datePicker.tomorrow'),
          dayAfter: t('datePicker.dayAfter'),
          hour: t('datePicker.hour'),
          min: t('datePicker.min'),
          cancel: t('common.cancel'),
          setReminder: t('datePicker.setReminder'),
          futureWarning: t('datePicker.futureWarning'),
        }}
      />
    </SafeAreaView>
  );
}
