import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Bell,
} from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

export function CalendarDay({ item, isSelected, onPress, colors }) {
  // Enhanced dynamic card container theme mapping
  const cardStyle = {
    flex: 1,
    height: isSelected ? 82 : 68,
    borderRadius: isSelected ? 20 : 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: isSelected ? colors.primary : colors.backgroundCard,
    borderWidth: 1,
    borderColor: isSelected ? colors.primary : colors.borderLight,
    ...Platform.select({
      ios: isSelected ? {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      } : null,
      android: isSelected ? {
        elevation: 6,
      } : null,
    }),
  };

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.2,
          color: isSelected ? colors.textOnPrimary : colors.textMuted,
          marginBottom: 2,
        }}
      >
        {item.dayNameShort || item.day}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "900",
          letterSpacing: -0.5,
          color: isSelected ? colors.textOnPrimary : colors.text,
        }}
      >
        {item.dayNumber || item.num}
      </Text>
      {isSelected && (
        <View
          style={{
            position: "absolute",
            bottom: 6,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.textOnPrimary,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

export function MonthSelector({ monthLabel, onPrev, onNext, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          letterSpacing: -0.5,
          color: colors.text,
        }}
      >
        {monthLabel}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: colors.backgroundCard,
          padding: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.borderLight,
        }}
      >
        <TouchableOpacity
          onPress={onPrev}
          style={{ padding: 6, justifyContent: "center", alignItems: "center" }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ width: 1, height: 12, backgroundColor: colors.borderLight }} />
        <TouchableOpacity
          onPress={onNext}
          style={{ padding: 6, justifyContent: "center", alignItems: "center" }}
          activeOpacity={0.7}
        >
          <ChevronRight size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function Avatar({ uri, colors }) {
  const avatarStyle = { width: 32, height: 32, borderRadius: 16 };
  if (uri) {
    return <Image source={{ uri }} style={avatarStyle} />;
  }
  return <View style={[avatarStyle, { backgroundColor: colors.border }]} />;
}

export function ProfileBadge({ onPress, profileName, avatarUri, colors }) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundCard,
        paddingLeft: 6,
        paddingRight: 14,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Avatar uri={avatarUri} colors={colors} />
      <View>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: -0.2,
          }}
        >
          {profileName || "Rider"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function ActionButtons({ isOnline, unreadCount, onToggleOnline, onNavigateNotifications, colors, isDarkMode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {/* Sleek, Rounded Network Presence Pill */}
      <TouchableOpacity
        style={{
          height: 40,
          borderRadius: 100,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          gap: 8,
          backgroundColor: isOnline 
            ? (isDarkMode ? "rgba(16, 185, 129, 0.15)" : "#e6f4ea")
            : colors.backgroundCard,
          borderWidth: 1,
          borderColor: isOnline ? colors.success : colors.borderLight,
        }}
        onPress={onToggleOnline}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: isOnline ? colors.success : colors.textDisabled,
          }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: isOnline ? colors.success : colors.textSecondary,
          }}
        >
          {isOnline ? "Go Offline" : "Go Online"}
        </Text>
      </TouchableOpacity>

      {/* Styled Icon Notification Trigger Container */}
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.backgroundCard,
          borderWidth: 1,
          borderColor: colors.borderLight,
          position: "relative",
        }}
        onPress={onNavigateNotifications}
        activeOpacity={0.8}
      >
        <Bell size={18} color={colors.text} />
        {unreadCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: 11,
              right: 12,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.danger,
            }}
          />
        )}
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
  const { colors, isDarkMode } = useThemeStore();

  const monthLabel = weekStart
    ? weekStart.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const containerStyle = {
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.2 : 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  };

  return (
    <View style={containerStyle}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <View style={{ paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 16 }}>
        {/* Profile Identity and Utility Layout */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: 24,
          }}
        >
          <ProfileBadge onPress={onNavigateProfile} profileName={profileName} avatarUri={avatarUri} colors={colors} />
          <ActionButtons
            isOnline={isOnline}
            unreadCount={unreadCount}
            onToggleOnline={onToggleOnline}
            onNavigateNotifications={onNavigateNotifications}
            colors={colors}
            isDarkMode={isDarkMode}
          />
        </View>

        {/* Calendar Management Controls */}
        <MonthSelector monthLabel={monthLabel} onPrev={onMonthPrev} onNext={onMonthNext} colors={colors} />
        
        {/* Horizon Calendar Carousel Strip */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8 }}>
          {calendarDays.map((dayItem, index) => (
            <CalendarDay
              key={dayItem.rawDateString || dayItem.date || String(index)}
              item={dayItem}
              isSelected={index === selectedDayIndex}
              onPress={() => {
                if (onSelectDay) onSelectDay(index);
              }}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </View>
  );
}