import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TABS = [
  { key: 'requests',  label: 'Requests' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function RiderTabBar({ activeTab = 'requests', onTabChange }) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TabButton
          key={tab.key}
          label={tab.label}
          active={activeTab === tab.key}
          onPress={() => onTabChange?.(tab.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderColor: '#115e59',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeTabButtonText: {
    color: '#115e59',
    fontWeight: '800',
  },
});
