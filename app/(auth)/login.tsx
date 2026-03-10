import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground, ActivityIndicator, StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

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
      <View className="flex-1">
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
            <View className="items-center mb-10 mt-10">
              <View className="bg-white/20 p-4 rounded-full mb-4">
                <GraduationCap size={48} color="white" />
              </View>
              <Text className="text-white text-3xl font-muller-bold text-center">
                PMSA Wafy College
              </Text>
              <Text className="text-white/80 text-base font-muller mt-2 text-center px-8">
                Your portal to academic excellence and campus life.
              </Text>
            </View>

            {/* Floating Form Card */}
            <View className="p-6 rounded-3xl shadow-xl w-full max-w-md mx-auto">
              <Text className="text-2xl font-muller-bold text-white mb-1 text-center">
                Welcome Back
              </Text>
              <Text className="text-white/80 mb-6 font-muller text-center text-sm">
                Enter your credentials to continue
              </Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-muller text-white mb-2">Email Address</Text>
                <TextInput
                  className="w-full border border-zinc-200 font-muller rounded-xl px-4 py-4 text-base text-white/80"
                  placeholder="you@pmsa.com"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-sm font-muller text-white mb-2">Password</Text>
                <TextInput
                  className="w-full border border-zinc-200 rounded-xl font-muller px-4 py-4 text-base text-white/80"
                  placeholder="••••••••"
                  placeholderTextColor="#a1a1aa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View className="flex-row items-center bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
                  <AlertCircle size={20} color="#dc2626" />
                  <Text className="text-red-600 ml-2 flex-1 font-medium">{error}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className={loading ? "w-full py-4 rounded-xl flex-row justify-center items-center bg-green-800" : "w-full py-4 rounded-xl flex-row justify-center items-center bg-green-950"}
              >
                <Text className="text-white text-lg font-muller">
                  {loading ? "Signing In... " : "Sign In "}
                </Text>
                {loading ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : (
                  <LogIn size={20} color="white" className="mr-2" />
                )}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

// Using standard StyleSheet for outer structural elements to ensure NativeWind cross-platform compatibility
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  }
});