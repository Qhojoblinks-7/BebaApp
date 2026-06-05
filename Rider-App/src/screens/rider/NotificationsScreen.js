import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Bell, Package } from 'lucide-react-native';
import DeliveryDetailsBottomSheet from '../../components/rider/DeliveryDetailsBottomSheet';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select(`*, orders:order_id(order_id, item_description, pickup_address)`)
      .eq('rider_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        payload => {
          if (payload.new.rider_id === user?.id) {
            setNotifications(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifications, user?.id]);

  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, item.is_read && styles.cardRead]} 
      onPress={() => {
        markAsRead(item.id);
        if (item.orders) {
          setSelectedOrder({
            id: item.order_id,
            order_id: item.orders.order_id,
            item_description: item.orders.item_description,
            pickup_address: item.orders.pickup_address,
            customer_name: item.orders.orders?.customer_name,
            customer_phone: item.orders.orders?.customer_phone,
            delivery_address: item.orders.orders?.delivery_address,
            delivery_fee: item.orders.orders?.delivery_fee,
            status: item.title.includes('New') ? 'pending' : 'assigned',
          });
        }
      }}
    >
      <View style={styles.cardHeader}>
        <Bell size={16} color="#38bdf8" />
        <Text style={[styles.title, item.is_read && styles.titleRead]}>{item.title}</Text>
      </View>
      <Text style={styles.body}>{item.body}</Text>
      {item.orders && (
        <Text style={styles.orderInfo}>Waybill: {item.orders.order_id}</Text>
      )}
      <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#115e59" translucent />
      <View style={[styles.headerBackground, styles.safeHeader]}>
        <View style={styles.headerContent}>
          <Text style={styles.headingOnBg}>Notifications</Text>
        </View>
      </View>
      
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
        renderItem={renderNotification}
      />

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={(order, status) => {
          if (status === 'pending') {
            alert('Please use the Job Board tab to accept this order.');
          }
          setSelectedOrder(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  headerBackground: {
    backgroundColor: '#115e59',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 }
    })
  },
  safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 48 },
  headerContent: { paddingTop: Platform.OS === 'android' ? 16 : 16 },
  heading: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  headingOnBg: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardRead: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  titleRead: { color: '#64748b' },
  body: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  orderInfo: { fontSize: 11, color: '#38bdf8', fontWeight: '600', marginBottom: 4 },
  time: { fontSize: 10, color: '#94a3b8', textAlign: 'right' }
});