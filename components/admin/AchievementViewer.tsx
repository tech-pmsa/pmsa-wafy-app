import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Trophy, User as UserIcon, Search, Inbox, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
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

function AchievementDisplayCard({ achievement }: { achievement: any }) {
  return (
    <View
      className="bg-[#FFFFFF] rounded-[16px] mb-4 border border-[#E2E8F0] overflow-hidden"
      style={cardShadow()}
    >
      <View className="p-4 flex-row items-start gap-3.5">
        <View className="bg-[#1E40AF]/10 p-3 rounded-[12px] border border-[#1E40AF]/10">
          <Trophy size={22} color={COLORS.primary} />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-[15px] font-muller-bold text-[#0F172A] tracking-tight leading-snug">
            {achievement.title}
          </Text>
          <Text className="text-[11px] font-muller-bold text-[#94A3B8] mt-1.5 uppercase tracking-wider">
            {new Date(achievement.submitted_at).toLocaleDateString('en-GB', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </Text>
        </View>
      </View>

      <View className="px-4 pb-4">
        <Text className="text-[13px] font-muller text-[#475569] leading-relaxed" numberOfLines={3}>
          {achievement.description}
        </Text>
      </View>

      <View className="bg-[#F8FAFC] p-4 border-t border-[#E2E8F0] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          <UserIcon size={16} color="#94A3B8" />
          <Text className="text-[13px] font-muller-bold text-[#0F172A] ml-2 truncate" numberOfLines={1}>
            {achievement.name} <Text className="text-[#94A3B8] font-muller">({achievement.cic})</Text>
          </Text>
        </View>

        {achievement.proof_url && (
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center bg-[#1E40AF]/10 px-3 py-1.5 rounded-[8px] border border-[#1E40AF]/20"
            onPress={() => Linking.openURL(achievement.proof_url)}
          >
            <Text className="text-[11px] font-muller-bold text-[#1E40AF] mr-1.5 uppercase tracking-wider">Proof</Text>
            <ExternalLink size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AchievementViewer() {
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('approved', true)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error("Error fetching achievements:", error);
      } else if (data) {
        setAllAchievements(data);
        const uniqueBatches = ['All', ...[...new Set(data.map((a) => a.batch))].filter(Boolean).sort()];
        setBatches(uniqueBatches);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const filteredAchievements = useMemo(() => {
    let filtered = allAchievements;
    if (selectedBatch !== 'All') {
      filtered = filtered.filter((a) => a.batch === selectedBatch);
    }
    if (search) {
      const lowercasedSearch = search.toLowerCase();
      return filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(lowercasedSearch) ||
          a.cic?.toLowerCase().includes(lowercasedSearch) ||
          a.title.toLowerCase().includes(lowercasedSearch)
      );
    }
    return filtered;
  }, [search, selectedBatch, allAchievements]);

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
      style={cardShadow()}
    >
      <View className="mb-5">
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Approved Achievements</Text>
        <Text className="text-sm font-muller text-[#475569] mt-0.5">Browse student achievements.</Text>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-5 shadow-sm">
        <Search size={20} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
          placeholder="Search by name, CIC, or title..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Mobile Tabs (Horizontal ScrollView) */}
      {batches.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 -ml-1 pl-1">
          {batches.map((b) => (
            <TouchableOpacity
              key={b}
              activeOpacity={0.7}
              onPress={() => setSelectedBatch(b)}
              className={`mr-2.5 px-5 py-2.5 rounded-[14px] border ${
                selectedBatch === b
                  ? 'bg-[#1E40AF] border-[#1E40AF]'
                  : 'bg-[#FFFFFF] border-[#E2E8F0]'
              }`}
            >
              <Text className={`font-muller-bold text-[13px] tracking-wide ${
                selectedBatch === b ? 'text-white' : 'text-[#475569]'
              }`}>
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Results List */}
      {isLoading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-[#475569] font-muller font-medium">Loading achievements...</Text>
        </View>
      ) : filteredAchievements.length === 0 ? (
        <View className="items-center justify-center py-12 border border-dashed border-[#E2E8F0] rounded-[16px] bg-[#F8FAFC]">
          <Inbox size={40} color="#94A3B8" />
          <Text className="mt-4 text-[13px] font-muller text-[#475569]">No achievements match your criteria.</Text>
        </View>
      ) : (
        <View className="pb-2">
          {filteredAchievements.map((ach) => (
            <AchievementDisplayCard key={ach.id} achievement={ach} />
          ))}
        </View>
      )}
    </View>
  );
}