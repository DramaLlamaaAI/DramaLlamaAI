import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { getUserUsage } = useApi();
  const [usage, setUsage] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const usageData = await getUserUsage();
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsage();
    setRefreshing(false);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'beta': return '#8b5cf6';
      case 'pro': return '#059669';
      case 'personal': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'beta': return 'Beta';
      case 'pro': return 'Pro';
      case 'personal': return 'Personal';
      default: return 'Free';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{user?.username}!</Text>
        <View style={[styles.tierBadge, { backgroundColor: getTierColor(user?.tier || 'free') }]}>
          <Text style={styles.tierText}>{getTierName(user?.tier || 'free')} Plan</Text>
        </View>
      </View>

      {usage && (
        <View style={styles.usageCard}>
          <Text style={styles.cardTitle}>Your Usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Analyses Used:</Text>
            <Text style={styles.usageValue}>
              {usage.used} / {usage.limit === -1 ? '∞' : usage.limit}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: usage.limit === -1 ? '100%' : `${Math.min((usage.used / usage.limit) * 100, 100)}%`,
                  backgroundColor: usage.limit === -1 ? '#059669' : usage.used >= usage.limit ? '#ef4444' : '#3b82f6',
                }
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Chat Analysis')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Analyze Chat</Text>
            <Text style={styles.actionSubtitle}>
              Get insights into conversation tone and dynamics
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Script Builder')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="document-text" size={24} color="#059669" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Build Scripts</Text>
            <Text style={styles.actionSubtitle}>
              Generate responses for difficult conversations
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <Text style={styles.sectionTitle}>Features</Text>
        
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Ionicons name="analytics" size={32} color="#3b82f6" />
            <Text style={styles.featureTitle}>AI Analysis</Text>
            <Text style={styles.featureText}>
              Advanced conversation analysis using Claude AI
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={32} color="#059669" />
            <Text style={styles.featureTitle}>Privacy First</Text>
            <Text style={styles.featureText}>
              Your conversations are analyzed securely and privately
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="bulb" size={32} color="#f59e0b" />
            <Text style={styles.featureTitle}>Smart Insights</Text>
            <Text style={styles.featureText}>
              Get actionable insights to improve communication
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="people" size={32} color="#8b5cf6" />
            <Text style={styles.featureTitle}>Relationship Health</Text>
            <Text style={styles.featureText}>
              Track and improve your relationship dynamics
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  usernameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  usageCard: {
    margin: 16,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickActions: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  features: {
    margin: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default HomeScreen;