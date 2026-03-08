import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView, Linking } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { Link } from 'expo-router';
import { Trophy, User as UserIcon, Link as LinkIcon, ArrowRight, X } from 'lucide-react-native';

// --- Sub-components ---

// 1. Clickable List Item
function AchievementListItem({ achievement, onClick }: { achievement: any, onClick: () => void }) {
  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.7}
      className="flex-row items-center p-3 mb-2 bg-zinc-50 rounded-2xl border border-zinc-100"
    >
      <View className="h-12 w-12 rounded-xl bg-blue-100 items-center justify-center overflow-hidden border border-blue-200">
        {achievement.students?.img_url ? (
          <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
        ) : (
          <Trophy size={20} color="#2563eb" />
        )}
      </View>
      <View className="flex-1 ml-3 mr-2">
        <Text className="font-bold text-zinc-900 text-base" numberOfLines={1}>
          {achievement.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <UserIcon size={12} color="#71717a" />
          <Text className="text-xs text-zinc-500 ml-1 truncate" numberOfLines={1}>
            {achievement.name} ({achievement.cic})
          </Text>
        </View>
      </View>
      <Text className="text-xs font-medium text-zinc-400">
        {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
}

// 2. Details Modal
function AchievementDetailsModal({ achievement, isOpen, onClose }: { achievement: any | null, isOpen: boolean, onClose: () => void }) {
  if (!achievement) return null;

  const isImageProof = achievement.proof_url && /\.(jpg|jpeg|png|gif)$/i.test(achievement.proof_url);

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 shadow-xl max-h-[85%]">

          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row flex-1 pr-4">
              <View className="bg-blue-50 p-3 rounded-xl mr-4 self-start">
                <Trophy size={28} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-zinc-900">{achievement.title}</Text>
                <Text className="text-xs text-zinc-500 mt-1">
                  Submitted on {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-zinc-100 p-2 rounded-full">
              <X size={20} color="#09090b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
            <Text className="text-zinc-700 text-base leading-6 mb-6">
              {achievement.description}
            </Text>

            {isImageProof && (
              <View className="rounded-2xl border border-zinc-200 overflow-hidden mb-4 bg-zinc-50">
                <Image
                  source={{ uri: achievement.proof_url }}
                  className="w-full h-64"
                  resizeMode="contain"
                />
              </View>
            )}

            {achievement.proof_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL(achievement.proof_url)}
                className="flex-row items-center justify-center bg-zinc-100 py-3 rounded-xl border border-zinc-200"
              >
                <LinkIcon size={18} color="#09090b" />
                <Text className="ml-2 font-bold text-zinc-900">View Full Proof</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View className="border-t border-zinc-100 pt-4 flex-row items-center">
            <View className="h-10 w-10 rounded-full bg-zinc-200 items-center justify-center overflow-hidden">
              {achievement.students?.img_url ? (
                <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
              ) : (
                <UserIcon size={20} color="#71717a" />
              )}
            </View>
            <View className="ml-3">
              <Text className="text-sm font-bold text-zinc-900">{achievement.name}</Text>
              <Text className="text-xs text-zinc-500">{achievement.cic}</Text>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// --- Main Component ---
export default function ApprovedAchievements() {
  const { role, details, loading: userLoading } = useUserData();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);

  useEffect(() => {
    if (userLoading) return;
    const fetchAchievements = async () => {
      setIsLoading(true);
      let query = supabase.from('achievements').select('*, students(img_url)').eq('approved', true);

      if (role === 'student' && details?.cic) {
        query = query.eq('cic', details.cic);
      } else if (role === 'class' && details?.batch) {
        query = query.eq('batch', details.batch);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false }).limit(5);

      if (error) {
        console.error("Error fetching achievements:", error);
      } else if (data) {
        setAchievements(data);
      }
      setIsLoading(false);
    };

    fetchAchievements();
  }, [role, details, userLoading]);

  const title = useMemo(() => {
    if (role === 'student') return 'My Recent Achievements';
    if (role === 'class') return 'Recent Class Achievements';
    return 'Latest College Achievements';
  }, [role]);

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">{title}</Text>
        <Text className="text-sm text-zinc-500 mt-1">A showcase of recent accomplishments.</Text>
      </View>

      {isLoading || userLoading ? (
        <ActivityIndicator size="large" color="#09090b" className="my-6" />
      ) : achievements.length === 0 ? (
        <View className="items-center justify-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
          <Trophy size={32} color="#a1a1aa" />
          <Text className="mt-2 text-sm font-medium text-zinc-500">No approved achievements yet.</Text>
        </View>
      ) : (
        <View>
          {achievements.map((ach) => (
            <AchievementListItem
              key={ach.id}
              achievement={ach}
              onClick={() => setSelectedAchievement(ach)}
            />
          ))}
        </View>
      )}

      {/* View All Button for Non-Students */}
      {role !== 'student' && achievements.length > 0 && (
        <Link href="/(admin)/achievements" asChild>
          <TouchableOpacity className="mt-2 flex-row justify-center items-center py-3">
            <Text className="text-blue-600 font-bold mr-1">View All Achievements</Text>
            <ArrowRight size={16} color="#2563eb" />
          </TouchableOpacity>
        </Link>
      )}

      <AchievementDetailsModal
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
      />
    </View>
  );
}