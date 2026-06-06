import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Bell,
} from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

const base = StyleSheet.create({
  headerBackground: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  safeHeader: { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  profileBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.95)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, gap: 8 },
  profileTextContainer: { paddingRight: 2 },
  profileName: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  actionButtonGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineStatusButton: { height: 38, borderRadius: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 6, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  notificationCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", position: "relative" },
  notificationDot: { position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  statusTextIndicator: { fontSize: 12, fontWeight: "800" },
  monthSelectorRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 16 },
  monthText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  navChevronPadding: { padding: 8, justifyContent: "center", alignItems: "center" },
  calendarStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 4 },
  calendarCardBase: { flex: 1, height: 64, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  activeCalendarCard: { height: 86, borderRadius: 24, paddingBottom: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  dayLabel: { fontSize: 11, fontWeight: "600" },
  dayNumber: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  activeDayLabel: { fontWeight: "700", marginBottom: 2 },
  activeDayNumber: { fontSize: 18, fontWeight: "900" },
  activeSubLabel: { fontSize: 10, fontWeight: "800", marginTop: 2 },
});

function CalendarDay({ item, isSelected, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        base.calendarCardBase,
        isSelected && [base.activeCalendarCard, { shadowColor: colors.shadow }],
        {
          backgroundColor: isSelected ? colors.backgroundCard : colors.primaryAlpha,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[base.dayLabel, isSelected && base.activeDayLabel, { color: isSelected ? colors.textSecondary : colors.textOnPrimary }]}>
        {item.dayNameShort || item.day}
      </Text>
      <Text style={[base.dayNumber, isSelected && base.activeDayNumber, { color: isSelected ? colors.text : colors.textOnPrimary }]}>
        {item.dayNumber || item.num}
      </Text>
      {isSelected && (
        <Text style={[base.activeSubLabel, { color: colors.primary }]} numberOfLines={1}>
          {(item.dayNameFull || item.day).substring(0, 3)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MonthSelector({ monthLabel, onPrev, onNext, colors }) {
  return (
    <View style={base.monthSelectorRow}>
      <TouchableOpacity onPress={onPrev} style={base.navChevronPadding} activeOpacity={0.7}>
        <ChevronLeft size={18} color={colors.textOnPrimary} />
      </TouchableOpacity>
      <Text style={[base.monthText, { color: colors.textOnPrimary }]}>{monthLabel}</Text>
      <TouchableOpacity onPress={onNext} style={base.navChevronPadding} activeOpacity={0.7}>
        <ChevronRight size={18} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function Avatar({ uri, colors }) {
  const avatarStyle = { width: 28, height: 28, borderRadius: 14 };
  if (uri) {
    return <Image source={{ uri }} style={avatarStyle} />;
  }
  return <View style={[avatarStyle, { backgroundColor: colors.border }]} />;
}

function ProfileBadge({ onPress, profileName, avatarUri, colors }) {
  return (
    <TouchableOpacity style={base.profileBadge} onPress={onPress} activeOpacity={0.8}>
      <Avatar uri={avatarUri} colors={colors} />
      <View style={base.profileTextContainer}>
        <Text style={base.profileName}>{profileName || "Rider"}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ActionButtons({ isOnline, unreadCount, onToggleOnline, onNavigateNotifications, colors }) {
  return (
    <View style={base.actionButtonGroup}>
      <TouchableOpacity
        style={[base.onlineStatusButton, { backgroundColor: isOnline ? colors.successLight : colors.backgroundCard, shadowColor: colors.shadow }]}
        onPress={onToggleOnline}
        activeOpacity={0.8}
      >
        {isOnline ? (
          <Wifi size={16} color={colors.success} />
        ) : (
          <WifiOff size={16} color={colors.textSecondary} />
        )}
        <Text style={[base.statusTextIndicator, { color: isOnline ? colors.success : colors.textSecondary }]}>
          {isOnline ? "Online" : "Offline"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[base.notificationCircle, { backgroundColor: colors.backgroundCard }]} onPress={onNavigateNotifications} activeOpacity={0.8}>
        <Bell size={18} color={colors.text} />
        {unreadCount > 0 && <View style={[base.notificationDot, { backgroundColor: colors.danger, borderColor: colors.backgroundCard }]} />}
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardHeader({
  isOnline = false,
  unreadCount = 0,
  onToggleOnline,
  onNavigateNotifications,
  onNavigateProfile,
  weekStart,
  onMonthPrev,
  onMonthNext,
  calendarDays = [],
  selectedDayIndex,
  onSelectDay,
  profileName,
  avatarUri,
}) {
  const colors = useThemeStore((state) => state.colors);

  const monthLabel = weekStart
    ? weekStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";
  return (
    <View
      style={[base.headerBackground, { backgroundColor: colors.primary }, Platform.select({ ios: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12 }, android: { elevation: 8 } })]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      <View style={base.safeHeader}>
        <View style={base.headerRow}>
          <ProfileBadge onPress={onNavigateProfile} profileName={profileName} avatarUri={avatarUri} colors={colors} />
          <ActionButtons isOnline={isOnline} unreadCount={unreadCount} onToggleOnline={onToggleOnline} onNavigateNotifications={onNavigateNotifications} colors={colors} />
        </View>
        <MonthSelector monthLabel={monthLabel} onPrev={onMonthPrev} onNext={onMonthNext} colors={colors} />
        <View style={base.calendarStrip}>
          {calendarDays.map((dayItem, index) => (
            <CalendarDay key={dayItem.rawDateString || dayItem.date || String(index)} item={dayItem} isSelected={index === selectedDayIndex} onPress={() => { if (onSelectDay) onSelectDay(index); }} colors={colors} />
          ))}
        </View>
      </View>
    </View>
  );
}