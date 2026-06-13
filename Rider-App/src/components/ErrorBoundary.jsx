import React, { Component } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>App Error</Text>
            <Text style={styles.message}>
              {this.state.error?.message || "Something went wrong"}
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#ef4444",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 16,
  },
  message: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#020617",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default ErrorBoundary;