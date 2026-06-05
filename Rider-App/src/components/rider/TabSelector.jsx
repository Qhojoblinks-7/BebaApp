import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TabSelector({ activeTab = 'deliveries', onTabChange }) {
  return (
    <View style={styles.tabContainer}>
      <TabButton
        label="Deliveries"
        active={activeTab === 'deliveries'}
        onPress={() => onTabChange?.('deliveries')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', marginTop: 20, marginBottom: 16, paddingHorizontal: 8 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTabButton: { borderBottomWidth: 2, borderColor: '#115e59' },
  tabButtonText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  activeTabButtonText: { color: '#115e59', fontWeight: '800' }
});
