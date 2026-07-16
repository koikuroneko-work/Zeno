import { Modal as RNModal, View } from 'react-native';
import React from 'react';
import { colors } from '@/design/tokens';

interface ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

/**
 * A simple modal wrapper with a dark backdrop.
 * For more complex modals,als, consider using a modal manager.
 */
export default function Modal({ visible, onRequestClose, children }: ModalProps) {
  return (
    <RNModal
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
      animationType='fade'
      hardwareAccelerated
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.surface, padding: 24, borderRadius: 12, width: '80%', maxWidth: 400 }}>
          {children}
        </View>
      </View>
    </RNModal>
  );
}