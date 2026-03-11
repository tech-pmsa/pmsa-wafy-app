import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground, ActivityIndicator, StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  // Simplified State (Removed Reset Password logic)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
      setLoading(false);
      return;
    }

    // On success, the Auth Guard in _layout.tsx will auto-redirect the user
    setLoading(false);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/pmsalogin.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Dark overlay to ensure text readability against any image */}
      <View style={styles.overlay} className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* Top Header / Logo */}
            <View className="items-center mb-8 mt-10">
              <View className="bg-white/20 p-4 rounded-[18px] mb-4 border border-white/20">
                <GraduationCap size={48} color="white" />
              </View>
              <Text className="text-white text-3xl font-muller-bold text-center tracking-tight">
                PMSA Wafy College
              </Text>
              <Text className="text-white/80 text-base font-muller mt-2 text-center px-8">
                Your portal to academic excellence and campus life.
              </Text>
            </View>

            {/* Floating Glassmorphism Form Card */}
            <BlurView
              intensity={40}
              tint="dark"
              className="p-6 rounded-[18px] border border-white/20 w-full max-w-md mx-auto overflow-hidden"
            >
              <Text className="text-2xl font-muller-bold text-white mb-2 text-center">
                Welcome Back
              </Text>
              <Text className="text-white/70 mb-8 font-muller text-center text-sm">
                Enter your credentials to continue
              </Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-muller text-white/90 mb-2 font-medium">Email Address</Text>
                <TextInput
                  className="w-full bg-white/10 border border-white/20 font-muller rounded-[14px] px-4 py-4 text-base text-white"
                  placeholder="you@pmsa.com"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-sm font-muller text-white/90 mb-2 font-medium">Password</Text>
                <TextInput
                  className="w-full bg-white/10 border border-white/20 rounded-[14px] font-muller px-4 py-4 text-base text-white"
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View className="flex-row items-center bg-red-500/20 p-4 rounded-[14px] mb-6 border border-red-500/50">
                  <AlertCircle size={20} color="#FECACA" />
                  <Text className="text-red-200 ml-2 flex-1 font-medium text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Login Button using Theme Primary Color */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={{ backgroundColor: COLORS.primary }}
                className={`w-full py-4 rounded-[14px] flex-row justify-center items-center mt-2 ${loading ? 'opacity-80' : ''}`}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : (
                  <LogIn size={20} color="white" className="mr-2" />
                )}
                <Text className="text-white text-lg font-muller-bold font-semibold tracking-wide">
                  {loading ? "Signing In..." : "Sign In"}
                </Text>
              </TouchableOpacity>
            </BlurView>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    // A subtle dark tint over the entire image to ensure text pops and isn't lost in bright parts of the image
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  }
});