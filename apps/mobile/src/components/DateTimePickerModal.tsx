import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Platform, TextInput } from 'react-native';
import { colors } from '@/design/tokens';

export interface DateTimePickerLabels {
  title?: string;
  today?: string;
  tomorrow?: string;
  dayAfter?: string;
  hour?: string;
  min?: string;
  cancel?: string;
  setReminder?: string;
  futureWarning?: string;
}

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
  labels?: DateTimePickerLabels;
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

const DEFAULT_LABELS: Required<DateTimePickerLabels> = {
  title: 'Set reminder time',
  today: 'Today',
  tomorrow: 'Tomorrow',
  dayAfter: 'Day after',
  hour: 'Hour',
  min: 'Min',
  cancel: 'Cancel',
  setReminder: 'Set Reminder',
  futureWarning: 'Please choose a future time.',
};

export default function DateTimePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
  labels: labelsProp,
}: DateTimePickerModalProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const now = initialDate || new Date();

  // Date state
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [day, setDay] = useState(now.getDate());

  // Time state (24h)
  const [hours, setHours] = useState(now.getHours());
  const [minutes, setMinutes] = useState(now.getMinutes());

  // Reset to current phone time every time the modal opens
  useEffect(() => {
    if (visible) {
      const source = initialDate || new Date();
      setYear(source.getFullYear());
      setMonth(source.getMonth());
      setDay(source.getDate());
      setHours(source.getHours());
      setMinutes(source.getMinutes());
      setEditingField(null);
      setEditValue('');
    }
  }, [visible, initialDate]);

  // Direct-edit state: which field is being typed into
  const [editingField, setEditingField] = useState<'hour' | 'minute' | null>(null);
  const [editValue, setEditValue] = useState('');
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  const commitHour = () => {
    const v = parseInt(editValue, 10);
    if (!isNaN(v) && v >= 0 && v <= 23) setHours(v);
    setEditingField(null);
  };
  const commitMinute = () => {
    const v = parseInt(editValue, 10);
    if (!isNaN(v) && v >= 0 && v <= 59) setMinutes(v);
    setEditingField(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build display date label
  const dateLabel = `${pad(day)}/${pad(month + 1)}/${year}`;

  const buildDate = (): Date => {
    const d = new Date(year, month, day, hours, minutes, 0, 0);
    return d;
  };

  const isValid = buildDate().getTime() > Date.now();

  const handleConfirm = () => {
    const d = buildDate();
    // Clamp to 1 minute in the future minimum
    if (d.getTime() <= Date.now()) {
      d.setTime(Date.now() + 60_000);
    }
    onConfirm(d);
  };

  // Date helpers
  const prevDay = () => {
    if (day > 1) setDay(day - 1);
    else if (month > 0) { setMonth(month - 1); setDay(new Date(year, month, 0).getDate()); }
    else { setYear(year - 1); setMonth(11); setDay(31); }
  };
  const nextDay = () => {
    if (day < daysInMonth) setDay(day + 1);
    else if (month < 11) { setMonth(month + 1); setDay(1); }
    else { setYear(year + 1); setMonth(0); setDay(1); }
  };

  // Quick date shortcuts
  const setToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setDay(t.getDate());
  };
  const setTomorrow = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setDay(t.getDate());
  };
  const setDayAfter = () => {
    const t = new Date();
    t.setDate(t.getDate() + 2);
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setDay(t.getDate());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: colors.surfaceAlt,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          }}
          onPress={() => {/* prevent close when tapping inside */}}
        >
          {/* Title */}
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, textAlign: 'center', marginBottom: 20 }}>
            {labels.title}
          </Text>

          {/* Quick date shortcuts */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
            {[
              { label: labels.today, action: setToday },
              { label: labels.tomorrow, action: setTomorrow },
              { label: labels.dayAfter, action: setDayAfter },
            ].map(({ label, action }) => (
              <TouchableOpacity
                key={label}
                onPress={action}
                style={{
                  backgroundColor: colors.surface,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 14, color: colors.ink }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={prevDay} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontSize: 24, color: colors.coral }}>◀</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, marginHorizontal: 16, minWidth: 120, textAlign: 'center' }}>
              {dateLabel}
            </Text>
            <TouchableOpacity onPress={nextDay} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontSize: 24, color: colors.coral }}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Time selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            {/* Hours */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setHours((hours + 1) % 24)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: colors.coral }}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingField('hour'); setEditValue(pad(hours)); setTimeout(() => hourInputRef.current?.focus(), 100); }}>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  marginVertical: 4,
                  borderWidth: editingField === 'hour' ? 2 : 1,
                  borderColor: editingField === 'hour' ? colors.coral : colors.border,
                }}>
                  {editingField === 'hour' ? (
                    <TextInput
                      ref={hourInputRef}
                      value={editValue}
                      onChangeText={setEditValue}
                      onBlur={commitHour}
                      onSubmitEditing={commitHour}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      style={{ fontSize: 28, fontWeight: '700', color: colors.ink, textAlign: 'center', padding: 0, minWidth: 40 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink }}>{pad(hours)}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHours((hours + 23) % 24)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: colors.coral }}>▼</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.inkLight, marginTop: 4 }}>{labels.hour}</Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink, marginHorizontal: 12 }}>:</Text>

            {/* Minutes */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setMinutes((minutes + 1) % 60)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: colors.coral }}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingField('minute'); setEditValue(pad(minutes)); setTimeout(() => minuteInputRef.current?.focus(), 100); }}>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  marginVertical: 4,
                  borderWidth: editingField === 'minute' ? 2 : 1,
                  borderColor: editingField === 'minute' ? colors.coral : colors.border,
                }}>
                  {editingField === 'minute' ? (
                    <TextInput
                      ref={minuteInputRef}
                      value={editValue}
                      onChangeText={setEditValue}
                      onBlur={commitMinute}
                      onSubmitEditing={commitMinute}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      style={{ fontSize: 28, fontWeight: '700', color: colors.ink, textAlign: 'center', padding: 0, minWidth: 40 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink }}>{pad(minutes)}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMinutes((minutes + 59) % 60)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: colors.coral }}>▼</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.inkLight, marginTop: 4 }}>{labels.min}</Text>
            </View>
          </View>

          {!isValid && (
            <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: 12 }}>
              {labels.futureWarning}
            </Text>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: colors.surface,
                marginRight: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>{labels.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: colors.coral,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '600', fontSize: 16 }}>{labels.setReminder}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
