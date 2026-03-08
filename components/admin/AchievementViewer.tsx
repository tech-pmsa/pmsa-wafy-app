import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Trophy, User as UserIcon, Search, Inbox, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

function AchievementDisplayCard({ achievement }: { achievement: any }) {
  return (
    <View className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-zinc-100">
      <View className="p-4 flex-row items-start gap-4">
        <View className="bg-blue-50 p-3 rounded-xl">
          <Trophy size={24} color="#2563eb" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-zinc-900">{achievement.title}</Text>
          <Text className="text-xs text-zinc-500 mt-1">
            {new Date(achievement.submitted_at).toLocaleDateString('en-GB', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </Text>
        </View>
      </View>

      <View className="px-4 pb-4">
        <Text className="text-sm text-zinc-600 leading-5" numberOfLines={3}>
          {achievement.description}
        </Text>
      </View>

      <View className="bg-zinc-50 p-4 border-t border-zinc-100 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          <UserIcon size={16} color="#71717a" />
          <Text className="text-sm font-medium text-zinc-900 ml-2 truncate" numberOfLines={1}>
            {achievement.name} <Text className="text-zinc-500 font-normal">({achievement.cic})</Text>
          </Text>
        </View>

        {achievement.proof_url && (
          <TouchableOpacity
            className="flex-row items-center bg-zinc-200 px-3 py-1.5 rounded-lg"
            onPress={() => Linking.openURL(achievement.proof_url)}
          >
            <Text className="text-xs font-medium text-zinc-900 mr-1">Proof</Text>
            <ExternalLink size={14} color="#09090b" />
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
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">Approved Achievements</Text>
        <Text className="text-sm text-zinc-500">Browse student achievements.</Text>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-zinc-100 rounded-xl px-4 py-3 mb-4">
        <Search size={20} color="#71717a" />
        <TextInput
          className="flex-1 ml-2 text-base text-zinc-900"
          placeholder="Search by name, CIC, or title..."
          placeholderTextColor="#a1a1aa"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Mobile Tabs (Horizontal ScrollView) */}
      {batches.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {batches.map((b) => (
            <TouchableOpacity
              key={b}
              onPress={() => setSelectedBatch(b)}
              className={`mr-2 px-4 py-2 rounded-full border ${selectedBatch === b ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`}
            >
              <Text className={`${selectedBatch === b ? 'text-white' : 'text-zinc-700'} font-medium`}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Results List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#09090b" className="my-10" />
      ) : filteredAchievements.length === 0 ? (
        <View className="items-center justify-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
          <Inbox size={40} color="#a1a1aa" />
          <Text className="mt-4 text-sm font-medium text-zinc-500">No achievements match your criteria.</Text>
        </View>
      ) : (
        <View>
          {filteredAchievements.map((ach) => (
            <AchievementDisplayCard key={ach.id} achievement={ach} />
          ))}
        </View>
      )}
    </View>
  );
}