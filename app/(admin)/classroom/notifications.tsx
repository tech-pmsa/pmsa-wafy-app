import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert as NativeAlert, Modal, Linking } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Inbox, Link as LinkIcon, ExternalLink, X, User } from 'lucide-react-native';
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

// Type Definition
type Achievement = {
  id: number;
  title: string;
  description: string;
  name: string;
  cic: string;
  proof_url: string | null;
  submitted_at: string;
  students: { img_url: string | null } | null;
}

// Reusable component for the MOBILE notification card
function AchievementCard({
  achievement,
  onApprove,
  onDecline,
  onViewProof
}: {
  achievement: Achievement,
  onApprove: () => void,
  onDecline: () => void,
  onViewProof: () => void
}) {
  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] overflow-hidden border border-[#E2E8F0] mb-4"
      style={cardShadow()}
    >
      <View className="flex-row items-start gap-3.5 p-4 border-b border-[#E2E8F0]">
        <View className="h-12 w-12 rounded-[12px] bg-[#F1F5F9] border border-[#E2E8F0] items-center justify-center overflow-hidden">
          {achievement.students?.img_url ? (
            <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
          ) : (
            <User size={24} color="#94A3B8" />
          )}
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-[16px] font-muller-bold text-[#0F172A] tracking-tight">{achievement.title}</Text>
          <Text className="text-[13px] font-muller text-[#475569] mt-0.5">
            By <Text className="font-muller-bold text-[#0F172A]">{achievement.name}</Text> ({achievement.cic})
          </Text>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-[14px] font-muller text-[#475569] leading-relaxed">{achievement.description}</Text>
      </View>

      <View className="bg-[#F8FAFC] p-4 flex-row justify-between items-center border-t border-[#E2E8F0]">
        <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider flex-1">
          {formatDistanceToNow(new Date(achievement.submitted_at), { addSuffix: true })}
        </Text>
        <View className="flex-row gap-2.5">
          {achievement.proof_url ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onViewProof}
              className="bg-[#FFFFFF] border border-[#E2E8F0] p-2.5 rounded-[12px] items-center justify-center shadow-sm"
            >
              <LinkIcon size={18} color="#475569" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDecline}
            className="bg-[#DC2626]/10 border border-[#DC2626]/20 px-3.5 py-2.5 rounded-[12px] flex-row items-center"
          >
            <XCircle size={16} color={COLORS.danger} />
            <Text className="text-[#DC2626] font-muller-bold ml-1.5 text-[13px] tracking-wide">Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onApprove}
            className="bg-[#16A34A] px-4 py-2.5 rounded-[12px] flex-row items-center shadow-sm"
          >
            <CheckCircle2 size={16} color="white" />
            <Text className="text-white font-muller-bold ml-1.5 text-[13px] tracking-wide">Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Native Modal to preview image proofs
function ProofViewerModal({ url, onClose }: { url: string | null, onClose: () => void }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(url);

  return (
    <Modal visible={!!url} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-[#FFFFFF] rounded-t-[24px] pt-6 px-6 pb-8 border-t border-[#E2E8F0]">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Achievement Proof</Text>
              <Text className="text-[13px] font-muller text-[#475569] mt-1">Review the submitted document.</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="bg-[#F1F5F9] p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] items-center justify-center overflow-hidden mb-6 h-64">
            {isImage ? (
              <Image source={{ uri: url }} className="w-full h-full" resizeMode="contain" />
            ) : (
              <Text className="text-[#475569] font-muller px-8 text-center leading-relaxed">
                Preview not available for this file type. Please open in your browser to view.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.8}
            className="w-full bg-[#1E40AF] py-4 rounded-[14px] flex-row justify-center items-center shadow-sm"
          >
            <ExternalLink size={20} color="white" className="mr-2" />
            <Text className="text-white font-muller-bold text-[16px] tracking-wide">Open in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AchievementNotificationsPage() {
  const { details, loading: userLoading } = useUserData();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofToView, setProofToView] = useState<string | null>(null);

  useEffect(() => {
    const batch = details?.batch;
    if (userLoading || !batch) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchAchievements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('achievements')
        .select('*, students(img_url)')
        .eq('batch', batch)
        .eq('approved', false)
        .order('submitted_at', { ascending: false });

      if (error) {
        NativeAlert.alert('Error', 'Failed to fetch notifications.');
      } else {
        setAchievements(data as Achievement[] || []);
      }
      setLoading(false);
    };

    fetchAchievements();
  }, [details, userLoading]);

  const confirmAction = (action: 'approve' | 'decline', achievement: Achievement) => {
    NativeAlert.alert(
      `${action === 'approve' ? 'Approve' : 'Decline'} Achievement`,
      `Are you sure you want to ${action} "${achievement.title}" from ${achievement.name}? ${action === 'decline' ? 'This action is permanent.' : ''}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === 'approve' ? 'Approve' : 'Decline',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => executeAction(action, achievement)
        }
      ]
    );
  };

  const executeAction = async (action: 'approve' | 'decline', achievement: Achievement) => {
    setIsSubmitting(true);
    let error = null;

    if (action === 'approve') {
      ({ error } = await supabase.from('achievements').update({ approved: true }).eq('id', achievement.id));
    } else if (action === 'decline') {
      ({ error } = await supabase.from('achievements').delete().eq('id', achievement.id));
    }

    if (!error) {
      NativeAlert.alert("Success", `Achievement has been ${action}d.`);
      setAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
    } else {
      NativeAlert.alert(`Failed to ${action} achievement.`, error.message);
    }
    setIsSubmitting(false);
  };

  if (loading || userLoading) {
    return (
      <View className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">Notifications</Text>
        <Text className="text-[#475569] font-muller mt-1.5">Review pending achievements for your class.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {achievements.length === 0 ? (
          <View className="flex-col items-center justify-center py-20 bg-[#FFFFFF] rounded-[18px] border border-dashed border-[#E2E8F0] mt-4">
            <Inbox size={56} color="#94A3B8" />
            <Text className="mt-5 text-xl font-muller-bold text-[#0F172A] tracking-tight">All Caught Up!</Text>
            <Text className="mt-1.5 text-[14px] font-muller text-[#475569]">There are no pending achievements to review.</Text>
          </View>
        ) : (
          <View className="mt-2">
            {achievements.map((ach) => (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                onApprove={() => confirmAction('approve', ach)}
                onDecline={() => confirmAction('decline', ach)}
                onViewProof={() => setProofToView(ach.proof_url)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Proof Viewer Modal */}
      <ProofViewerModal url={proofToView} onClose={() => setProofToView(null)} />
    </SafeAreaView>
  );
}