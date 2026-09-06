import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@repo/tokens";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>__NAME__</Text>
      <Text>Shares @repo/tokens with web.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Number(spacing.md.replace("rem", "")) * 16,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
});
