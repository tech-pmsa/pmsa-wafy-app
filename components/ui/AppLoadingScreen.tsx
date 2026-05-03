import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { theme } from "@/theme/theme";

export default function AppLoadingScreen() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(35);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    opacity.value = withDelay(
      100,
      withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      100,
      withTiming(0, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      })
    );

    scale.value = withDelay(
      100,
      withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});