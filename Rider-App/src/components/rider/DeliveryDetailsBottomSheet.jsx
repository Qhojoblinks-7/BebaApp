import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Linking, Platform } from 'react-native';
import { X, Phone, CircleCheck, Package } from 'lucide-react-native';
import RiderOrderCard from './RiderOrderCard';

const STAGES = [
  { key: 'pending',    label: 'Order Request' },
  { key: 'assigned',   label: 'Rider Confirmed' },
  { key: 'picked_up',  label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cancelled',  label: 'Cancelled' },
];

export default function DeliveryDetailsBottomSheet({ order, visible, onClose, onAction }) {
  if (!order) return null;

  const currentIdx = STAGES.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';
  const isDone = order.status === 'delivered' || isCancelled;

  const fmt = (d) => {
    if (!d) return '---';
    const date = new Date(d);
    if (isNaN(date)) return '---';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <Text style={styles.title}>Order Details</Text>
              <TouchableOpacity onPress={onClose}><X size={22} color="#94a3b8" /></TouchableOpacity>
            </View>

            <RiderOrderCard order={order} />

            <View style={styles.timelineWrap}>
              {STAGES.map((stage, i) => {
                const isCancelledStage = order.status === 'cancelled' && i === STAGES.length - 1;
                const completedBeforeCancel = order.status === 'cancelled' && i < STAGES.length - 1;
                const done = (!isCancelled && i <= currentIdx) || completedBeforeCancel;
                const last = i === STAGES.length - 1;
                return (
                  <React.Fragment key={stage.key}>
                    <View style={styles.stageNode}>
                      {done ? (
                        <CircleCheck size={18} color="#ffffff" fill="#115e59" />
                      ) : isCancelledStage ? (
                        <View style={styles.circleCancelled} />
                      ) : (
                        <View style={styles.circleEmpty} />
                      )}
                      <Text style={[styles.stageLabel, done || isCancelledStage ? styles.stageLabelActive : null]}>
                        {stage.label}
                      </Text>
                    </View>
                    {!last && (
                      <View style={[styles.stageLine, done ? styles.stageLineActive : null]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Item</Text>
                <Text style={styles.infoValue}>{order.item_description || '---'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fee</Text>
                <Text style={styles.infoValueAccent}>GH¢ {(order.delivery_fee || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue}>{order.customer_name || '---'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pickup</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.infoValue}>{order.pickup_address || '---'}</Text>
                  <Text style={styles.infoSub}>{fmt(order.created_at)}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Drop-off</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.infoValue}>{order.delivery_address || '---'}</Text>
                  <Text style={styles.infoSub}>{fmt(order.received_at || order.updated_at)}</Text>
                </View>
              </View>
              {order.received_by ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Received By</Text>
                  <Text style={styles.infoValue}>{order.received_by}</Text>
                </View>
              ) : null}
              {(order.customer_phone || order.sender_phone) ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customer_phone || order.sender_phone}`)}>
                    <Text style={styles.phoneText}>{order.customer_phone || order.sender_phone}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {!isDone ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => onAction?.(order, order.status)}
              >
                <Text style={styles.primaryBtnText}>
                  {order.status === 'pending' ? 'Accept Job' :
                   order.status === 'assigned' ? 'Confirm Pickup' :
                   order.status === 'picked_up' ? 'Start Delivery' :
                   order.status === 'in_transit' ? 'Confirm Drop-off' : 'Proceed'}
                </Text>
              </TouchableOpacity>
            ) : isCancelled ? (
              <View style={styles.doneChipCancelled}>
                <Text style={styles.doneTextCancelled}>Order cancelled</Text>
              </View>
            ) : (
              <View style={styles.doneChip}>
                <Package size={16} color="#10b981" />
                <Text style={styles.doneText}>Workflow complete</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: '#16191e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: {
    width: 48, height: 5, borderRadius: 3, backgroundColor: '#475569',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  timelineWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f1115', marginHorizontal: 20, marginBottom: 20,
    paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14,
  },
  stageNode: { alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  circleEmpty: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#475569' },
  circleCancelled: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444' },
  stageLabel: { fontSize: 9, fontWeight: '800', color: '#475569', marginTop: 4 },
  stageLabelActive: { color: '#ffffff' },
  stageLine: { flex: 1, height: 2, backgroundColor: '#334155', marginHorizontal: -2, marginTop: -10, zIndex: 1 },
  stageLineActive: { backgroundColor: '#115e59' },
  infoSection: {
    backgroundColor: '#1e222b', borderRadius: 20, marginHorizontal: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#33415530',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'capitalize', width: 90 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#e2e8f0', textAlign: 'right' },
  infoValueAccent: { flex: 1, fontSize: 14, fontWeight: '800', color: '#f59e0b', textAlign: 'right' },
  infoSub: { fontSize: 11, fontWeight: '500', color: '#64748b', textAlign: 'right', marginTop: 2 },
  phoneText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#38bdf8', textAlign: 'right' },
  primaryBtn: {
    backgroundColor: '#115e59', marginHorizontal: 20, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff', letterSpacing: -0.2 },
  doneChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, marginHorizontal: 20,
  },
  doneText: { fontSize: 13, fontWeight: '700', color: '#10b981' },
  doneChipCancelled: {
    paddingVertical: 12, marginHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  doneTextCancelled: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});