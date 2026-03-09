import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert as NativeAlert, Modal, Linking } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Inbox, Link as LinkIcon, ExternalLink, X, User } from 'lucide-react-native';

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
    <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-200 mb-4">
      <View className="flex-row items-start gap-3 p-4 border-b border-zinc-100">
        <View className="h-12 w-12 rounded-full bg-zinc-100 border border-zinc-200 items-center justify-center overflow-hidden">
          {achievement.students?.img_url ? (
            <Image source={{ uri: achievement.students.img_url }} className="h-full w-full" />
          ) : (
            <User size={24} color="#a1a1aa" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-zinc-900">{achievement.title}</Text>
          <Text className="text-sm text-zinc-500">
            By <Text className="font-semibold text-zinc-700">{achievement.name}</Text> ({achievement.cic})
          </Text>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-sm text-zinc-600 leading-5">{achievement.description}</Text>
      </View>

      <View className="bg-zinc-50 p-4 flex-row justify-between items-center border-t border-zinc-100">
        <Text className="text-xs text-zinc-500 font-medium">
          {formatDistanceToNow(new Date(achievement.submitted_at), { addSuffix: true })}
        </Text>
        <View className="flex-row gap-2">
          {achievement.proof_url ? (
            <TouchableOpacity onPress={onViewProof} className="bg-white border border-zinc-300 p-2 rounded-lg items-center justify-center">
              <LinkIcon size={18} color="#52525b" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onDecline} className="bg-white border border-red-200 px-3 py-2 rounded-lg flex-row items-center">
            <XCircle size={16} color="#dc2626" />
            <Text className="text-red-600 font-semibold ml-1.5 text-sm">Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onApprove} className="bg-green-600 px-3 py-2 rounded-lg flex-row items-center">
            <CheckCircle2 size={16} color="white" />
            <Text className="text-white font-semibold ml-1.5 text-sm">Approve</Text>
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
    <Modal visible={!!url} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-100 pt-6 px-6 pb-8">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-zinc-900">Achievement Proof</Text>
            <Text className="text-sm text-zinc-500 mt-1">Review the submitted document.</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="bg-zinc-200 p-2 rounded-full">
            <X size={20} color="#09090b" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 bg-white border border-zinc-200 rounded-3xl items-center justify-center overflow-hidden mb-6">
          {isImage ? (
            <Image source={{ uri: url }} className="w-full h-full" resizeMode="contain" />
          ) : (
            <Text className="text-zinc-500 px-8 text-center">Preview not available for this file type. Please open in browser.</Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL(url)}
          className="w-full bg-blue-600 py-4 rounded-xl flex-row justify-center items-center shadow-sm"
        >
          <ExternalLink size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg">Open in Browser</Text>
        </TouchableOpacity>
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
      <View className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-bold text-zinc-900">Notifications</Text>
        <Text className="text-zinc-500 mt-1">Review pending achievements for your class.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {achievements.length === 0 ? (
          <View className="flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-200 mt-4">
            <Inbox size={64} color="#a1a1aa" />
            <Text className="mt-4 text-xl font-bold text-zinc-900">All Caught Up!</Text>
            <Text className="mt-2 text-sm text-zinc-500">There are no pending achievements to review.</Text>
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