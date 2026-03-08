import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

export default function LoginScreen() {
  const router = useRouter();

  // State for Login & Password Reset
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const currentYear = new Date().getFullYear();

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

    // On success, our _layout.tsx Auth Guard will detect the session change
    // and automatically route the user to their correct dashboard!
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetMsg({ type: 'error', text: "Please enter your email." });
      return;
    }
    setResetLoading(true);
    setResetMsg(null);

    // In React Native, we handle deep linking differently than web origin
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);

    if (error) {
      setResetMsg({ type: 'error', text: "Failed to send reset link. Please check the email address." });
    } else {
      setResetMsg({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
    }
    setResetLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-zinc-100"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        {/* Top Header Section with Image Background */}
        <ImageBackground
          source={require('../../assets/images/imglogin.jpeg')}
          className="h-72 w-full justify-end"
          resizeMode="cover"
        >
          {/* Dark overlay for readability */}
          <View className="absolute inset-0 bg-black/60" />

          <View className="p-6 relative z-10">
            <View className="flex-row items-center gap-3 mb-2">
              <GraduationCap size={32} color="white" />
              <Text className="text-white text-2xl font-bold">PMSA Wafy College</Text>
            </View>
            <Text className="text-white/80 text-base">
              Your portal to academic excellence and campus life.
            </Text>
          </View>
        </ImageBackground>

        {/* Bottom Form Section */}
        <View className="flex-1 px-6 pt-8 pb-12 bg-white rounded-t-3xl -mt-6">

          {view === 'login' ? (
            <View>
              <Text className="text-3xl font-bold text-zinc-900 mb-2">Welcome Back!</Text>
              <Text className="text-zinc-500 mb-8">Enter your credentials to access your dashboard.</Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-zinc-700 mb-2">Email</Text>
                <TextInput
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 text-base text-zinc-900"
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
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-zinc-700">Password</Text>
                  <TouchableOpacity onPress={() => setView('reset')}>
                    <Text className="text-sm font-medium text-blue-600">Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 text-base text-zinc-900"
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
                <View className="flex-row items-center bg-red-50 p-4 rounded-xl mb-6">
                  <AlertCircle size={20} color="#dc2626" />
                  <Text className="text-red-600 ml-2 flex-1">{error}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className={`w-full py-4 rounded-xl flex-row justify-center items-center ${loading ? 'bg-zinc-800' : 'bg-zinc-900'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : (
                  <LogIn size={20} color="white" className="mr-2" />
                )}
                <Text className="text-white text-lg font-semibold">{loading ? "Signing In..." : "Sign In"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Reset Password View
            <View>
              <Text className="text-3xl font-bold text-zinc-900 mb-2">Reset Password</Text>
              <Text className="text-zinc-500 mb-8">Enter your email to receive a password reset link.</Text>

              {resetMsg && (
                <View className={`flex-row items-center p-4 rounded-xl mb-6 ${resetMsg.type === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
                  {resetMsg.type === 'error' ? <AlertCircle size={20} color="#dc2626" /> : <CheckCircle2 size={20} color="#16a34a" />}
                  <Text className={`ml-2 flex-1 ${resetMsg.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
                    {resetMsg.text}
                  </Text>
                </View>
              )}

              <View className="mb-6">
                <Text className="text-sm font-medium text-zinc-700 mb-2">Email Address</Text>
                <TextInput
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 text-base text-zinc-900"
                  placeholder="you@pmsa.com"
                  placeholderTextColor="#a1a1aa"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!resetLoading}
                />
              </View>

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={resetLoading}
                className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900 mb-4"
              >
                {resetLoading && <ActivityIndicator color="white" className="mr-2" />}
                <Text className="text-white text-lg font-semibold">{resetLoading ? 'Sending...' : 'Send Reset Link'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setView('login')} className="py-2 items-center">
                <Text className="text-blue-600 font-medium text-base">Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View className="mt-10 items-center">
             <Text className="text-xs text-zinc-400">© {currentYear} PMSA Wafy College. All Rights Reserved.</Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}