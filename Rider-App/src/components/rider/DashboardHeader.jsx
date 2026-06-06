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

function CalendarDay({ item, isSelected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.calendarCard, isSelected && styles.activeCalendarCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.dayLabel, isSelected && styles.activeDayLabel]}>
        {item.dayNameShort || item.day}
      </Text>
      <Text style={[styles.dayNumber, isSelected && styles.activeDayNumber]}>
        {item.dayNumber || item.num}
      </Text>
      {isSelected && (
        <Text style={styles.activeSubLabel} numberOfLines={1}>
          {(item.dayNameFull || item.day).substring(0, 3)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MonthSelector({ monthLabel, onPrev, onNext }) {
  return (
    <View style={styles.monthSelectorRow}>
      <TouchableOpacity
        onPress={onPrev}
        style={styles.navChevronPadding}
        activeOpacity={0.7}
      >
        <ChevronLeft size={18} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.monthText}>{monthLabel}</Text>
      <TouchableOpacity
        onPress={onNext}
        style={styles.navChevronPadding}
        activeOpacity={0.7}
      >
        <ChevronRight size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

function Avatar({ uri }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatarImage} />;
  }
  return <View style={styles.avatarPlaceholder} />;
}

function ProfileBadge({ onPress, profileName, avatarUri }) {
  return (
    <TouchableOpacity style={styles.profileBadge} onPress={onPress} activeOpacity={0.8}>
      <Avatar uri={avatarUri} />
      <View style={styles.profileTextContainer}>
        <Text style={styles.profileName}>{profileName || "Rider"}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ActionButtons({
  isOnline,
  unreadCount,
  onToggleOnline,
  onNavigateNotifications,
}) {
  return (
    <View style={styles.actionButtonGroup}>
      <TouchableOpacity
        style={[
          styles.onlineStatusButton,
          isOnline ? styles.onlineActiveBtn : styles.offlineBtn,
        ]}
        onPress={onToggleOnline}
        activeOpacity={0.8}
      >
        {isOnline ? (
          <Wifi size={16} color="#115e59" />
        ) : (
          <WifiOff size={16} color="#64748b" />
        )}
        <Text
          style={[
            styles.statusTextIndicator,
            isOnline ? styles.onlineText : styles.offlineText,
          ]}
        >
          {isOnline ? "Online" : "Offline"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.notificationCircle}
        onPress={onNavigateNotifications}
        activeOpacity={0.8}
      >
        <Bell size={18} color="#0f172a" />
        {unreadCount > 0 && <View style={styles.notificationDot} />}
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
  const monthLabel = weekStart
    ? weekStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";
  return (
    <View style={styles.headerBackground}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#115e59"
        translucent
      />

      <View style={styles.safeHeader}>
        {/* Profile Details & Fleet Availability Switch Strip */}
        <View style={styles.headerRow}>
        <ProfileBadge onPress={onNavigateProfile} profileName={profileName} avatarUri={avatarUri} />
        <ActionButtons
            isOnline={isOnline}
            unreadCount={unreadCount}
            onToggleOnline={onToggleOnline}
            onNavigateNotifications={onNavigateNotifications}
          />
        </View>

        {/* Dynamic Month Pagination Title Row Bar */}
        <MonthSelector
          monthLabel={monthLabel}
          onPrev={onMonthPrev}
          onNext={onMonthNext}
        />

        {/* Interactive Horizontal Calendar Grid Strip Container */}
        <View style={styles.calendarStrip}>
          {calendarDays.map((dayItem, index) => (
            <CalendarDay
              key={dayItem.rawDateString || dayItem.date || String(index)}
              item={dayItem}
              isSelected={index === selectedDayIndex}
              onPress={() => {
                if (onSelectDay) onSelectDay(index);
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    backgroundColor: "#115e59",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  safeHeader: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#cbd5e1",
  },
  profileTextContainer: { paddingRight: 2 },
  profileName: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  actionButtonGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineStatusButton: {
    height: 38,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  onlineActiveBtn: { backgroundColor: "#e6f4ea" },
  offlineBtn: { backgroundColor: "#ffffff" },
  statusTextIndicator: { fontSize: 12, fontWeight: "800" },
  onlineText: { color: "#137333" },
  offlineText: { color: "#64748b" },
  notificationCircle: {
    backgroundColor: "#ffffff",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  monthSelectorRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  navChevronPadding: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  calendarCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCalendarCard: {
    backgroundColor: "#ffffff",
    height: 86,
    borderRadius: 24,
    paddingBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dayLabel: { fontSize: 11, fontWeight: "600", color: "#e2e8f0" },
  activeDayLabel: { color: '#64748b', fontWeight: '700', marginBottom: 2 },
  dayNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  activeDayNumber: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  activeSubLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#115e59",
    marginTop: 2,
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#cbd5e1",
  },
});