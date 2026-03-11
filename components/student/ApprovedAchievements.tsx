import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView, Linking } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { Trophy, User as UserIcon, Link as LinkIcon, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

// --- Sub-components ---

// 1. Clickable List Item
function AchievementListItem({ achievement, onClick }: { achievement: any, onClick: () => void }) {
  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.7}
      className="flex-row items-center p-3 mb-2.5 bg-[#F8FAFC] rounded-[16px] border border-[#E2E8F0]"
    >
      <View className="h-12 w-12 rounded-[12px] bg-[#1E40AF]/10 items-center justify-center overflow-hidden border border-[#1E40AF]/10">
        {achievement.students?.img_url ? (
          <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
        ) : (
          <Trophy size={20} color={COLORS.primary} />
        )}
      </View>
      <View className="flex-1 ml-3 mr-3">
        <Text className="font-muller-bold text-[#0F172A] text-[15px] tracking-tight" numberOfLines={1}>
          {achievement.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <UserIcon size={12} color="#94A3B8" />
          <Text className="text-[13px] font-muller text-[#475569] ml-1.5 truncate" numberOfLines={1}>
            {achievement.name} ({achievement.cic})
          </Text>
        </View>
      </View>
      <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
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
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-[#FFFFFF] rounded-t-[24px] p-6 shadow-xl max-h-[85%] border-t border-[#E2E8F0]">

          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-row flex-1 pr-4">
              <View className="bg-[#1E40AF]/10 p-3.5 rounded-[14px] mr-4 self-start border border-[#1E40AF]/10">
                <Trophy size={26} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight leading-snug">{achievement.title}</Text>
                <Text className="text-[11px] font-muller-bold text-[#94A3B8] mt-2 uppercase tracking-wider">
                  Submitted on {new Date(achievement.submitted_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="bg-[#F1F5F9] p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
            <Text className="text-[#475569] font-muller text-[15px] leading-relaxed mb-6">
              {achievement.description}
            </Text>

            {isImageProof && (
              <View className="rounded-[16px] border border-[#E2E8F0] overflow-hidden mb-5 bg-[#F8FAFC]">
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
                activeOpacity={0.7}
                className="flex-row items-center justify-center bg-[#F8FAFC] py-3.5 rounded-[14px] border border-[#E2E8F0]"
              >
                <LinkIcon size={18} color="#0F172A" />
                <Text className="ml-2.5 font-muller-bold text-[#0F172A]">View Full Proof</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View className="border-t border-[#E2E8F0] pt-5 flex-row items-center">
            <View className="h-11 w-11 rounded-[12px] bg-[#F1F5F9] items-center justify-center overflow-hidden border border-[#E2E8F0]">
              {achievement.students?.img_url ? (
                <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
              ) : (
                <UserIcon size={20} color="#94A3B8" />
              )}
            </View>
            <View className="ml-3.5">
              <Text className="text-[15px] font-muller-bold text-[#0F172A] tracking-tight">{achievement.name}</Text>
              <Text className="text-xs font-muller text-[#475569] mt-0.5">{achievement.cic}</Text>
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
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] my-2"
      style={cardShadow()}
    >
      <View className="mb-5">
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">{title}</Text>
        <Text className="text-sm font-muller text-[#475569] mt-1">A showcase of recent accomplishments.</Text>
      </View>

      {isLoading || userLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} className="my-6" />
      ) : achievements.length === 0 ? (
        <View className="items-center justify-center py-10 border border-dashed border-[#E2E8F0] rounded-[16px] bg-[#F8FAFC]">
          <Trophy size={32} color="#94A3B8" />
          <Text className="mt-3 text-[13px] font-muller text-[#475569]">No approved achievements yet.</Text>
        </View>
      ) : (
        <View className="pb-1">
          {achievements.map((ach) => (
            <AchievementListItem
              key={ach.id}
              achievement={ach}
              onClick={() => setSelectedAchievement(ach)}
            />
          ))}
        </View>
      )}

      <AchievementDetailsModal
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
      />
    </View>
  );
}