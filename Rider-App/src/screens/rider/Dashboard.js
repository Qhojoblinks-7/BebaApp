import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { startTrackingEngine, stopTrackingEngine } from '../../services/locationManager';
import DashboardHeader from '../../components/rider/DashboardHeader';
import TabSelector from '../../components/rider/TabSelector';
import DailySummaryCard from '../../components/rider/DailySummaryCard';
import RiderOrderCard from '../../components/rider/RiderOrderCard';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeekDays(fromMonday) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(fromMonday);
    d.setDate(fromMonday.getDate() + i);
    return {
      day: DAYS[d.getDay()],
      num: d.getDate(),
      date: d.toISOString().split('T')[0],
    };
  });
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    const dow = today.getDay();
    return dow === 0 ? 5 : dow - 1;
  });
  const [activeTab, setActiveTab] = useState('deliveries');
  const [dailySummary, setDailySummary] = useState({
    distanceKm: 0,
    earnings: 0,
    completedDrops: 0,
  });
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  const calendarDays = buildWeekDays(weekStart);
  const monthLabel = weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedDate = calendarDays[selectedDayIndex]?.date || new Date().toISOString().split('T')[0];

  async function fetchCurrentStatus() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('rider_status')
        .select('is_rider_online')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsOnline(data.is_rider_online);
        if (data.is_rider_online) {
          await startTrackingEngine();
        }
      }
    } catch (err) {
      console.warn('[Dashboard] System fallback reading presence state:', err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function fetchUnreadCount() {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.warn('[Dashboard] Unread database counter lookup failure:', err.message);
    }
  }

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }
    fetchCurrentStatus();
    fetchUnreadCount();

    return () => {
      stopTrackingEngine();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `rider_id=eq.${user.id}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const toggleAvailabilityState = async (value) => {
    setSyncing(true);
    try {
      if (value) {
        const trackingActive = await startTrackingEngine();
        if (!trackingActive) {
          setIsOnline(false);
          setSyncing(false);
          return;
        }
      } else {
        await stopTrackingEngine();
      }

      const { error } = await supabase
        .from('rider_status')
        .upsert({
          id: user.id,
          is_rider_online: value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setIsOnline(value);
    } catch (err) {
      console.warn('[Dashboard] State push sync layout error:', err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleMonthPrev = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleMonthNext = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleSelectDay = (index) => {
    setSelectedDayIndex(index);
  };

  async function fetchDailySummary() {
    if (!user?.id) return;
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      const { data: orders, error: ordersError } = await supabase
         .from('orders')
         .select('delivery_fee, received_at, status')
         .eq('rider_id', user.id)
         .in('status', ['delivered', 'picked_up', 'in_transit', 'assigned'])
         .gte('received_at', startOfDay)
         .lte('received_at', endOfDay);

      if (ordersError) throw ordersError;

      const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
      const completedDrops = orders?.length || 0;

      const { data: revenue, error: revenueError } = await supabase
        .from('revenue')
        .select('amount, order_completed_at')
        .eq('rider_id', user.id)
        .gte('order_completed_at', startOfDay)
        .lte('order_completed_at', endOfDay);

      if (revenueError) throw revenueError;

      const earnings = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const distanceKm = completedDrops * 5.4;

      setDailySummary({
        distanceKm: distanceKm.toFixed(1),
        earnings,
        completedDrops,
      });
    } catch (err) {
      console.warn('[Dashboard] Failed to fetch daily summary:', err.message);
    }
  }

  async function fetchDeliveryOrders() {
    if (!user?.id) return;
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('rider_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit', 'delivered'])
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('route_sequence', { ascending: true });

      if (error) throw error;
      setDeliveryOrders(data || []);
    } catch (err) {
      console.warn('[Dashboard] Failed to fetch delivery orders:', err.message);
    }
  }

  useEffect(() => {
    fetchDailySummary();
    fetchDeliveryOrders();
  }, [user?.id, selectedDate]);

  if (syncing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#115e59" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DashboardHeader
        isOnline={isOnline}
        unreadCount={unreadCount}
        onToggleOnline={() => toggleAvailabilityState(!isOnline)}
        onNavigateNotifications={() => navigation.navigate('Notifications')}
        onMonthPrev={handleMonthPrev}
        onMonthNext={handleMonthNext}
        calendarDays={calendarDays}
        selectedDayIndex={selectedDayIndex}
        onSelectDay={handleSelectDay}
        monthLabel={monthLabel}
      />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'deliveries' && (
          <View>
            <DailySummaryCard
              distanceKm={dailySummary.distanceKm}
              earnings={dailySummary.earnings}
              completedDrops={dailySummary.completedDrops}
            />
            {deliveryOrders.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionTitle}>Today's Dispatches</Text>
                <FlatList
                  data={deliveryOrders}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <RiderOrderCard order={item} />
                  )}
                />
              </View>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
});
