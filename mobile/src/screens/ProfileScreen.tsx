import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const ProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();
  const { getUserUsage } = useApi();
  const [usage, setUsage] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const usageData = await getUserUsage();
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'beta':
        return {
          name: 'Beta',
          color: '#8b5cf6',
          features: ['Unlimited analyses', 'All features', 'Priority support', 'Beta access'],
        };
      case 'pro':
        return {
          name: 'Pro',
          color: '#059669',
          features: ['50 analyses/month', 'Advanced insights', 'Script builder', 'Priority support'],
        };
      case 'personal':
        return {
          name: 'Personal',
          color: '#3b82f6',
          features: ['10 analyses/month', 'Basic insights', 'Script builder'],
        };
      default:
        return {
          name: 'Free',
          color: '#6b7280',
          features: ['2 analyses/month', 'Basic insights'],
        };
    }
  };

  const tierInfo = getTierInfo(user?.tier || 'free');

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
          <Text style={styles.tierText}>{tierInfo.name} Plan</Text>
        </View>
      </View>

      {/* Usage Stats */}
      {usage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage This Month</Text>
          <View style={styles.usageCard}>
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
        </View>
      )}

      {/* Plan Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Plan Features</Text>
        <View style={styles.featuresCard}>
          {tierInfo.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={tierInfo.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={20} color="#3b82f6" />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#f3f4f6', true: '#dbeafe' }}
              thumbColor={notifications ? '#3b82f6' : '#9ca3af'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={refreshUser}>
            <View style={styles.settingLeft}>
              <Ionicons name="refresh" size={20} color="#059669" />
              <Text style={styles.settingLabel}>Refresh Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle" size={20} color="#f59e0b" />
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text" size={20} color="#8b5cf6" />
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="card" size={20} color="#3b82f6" />
              <Text style={styles.settingLabel}>Upgrade Plan</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <Ionicons name="log-out" size={20} color="#ef4444" />
              <Text style={[styles.settingLabel, { color: '#ef4444' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Drama Llama AI v1.0.0</Text>
        <Text style={styles.appInfoText}>Built with ❤️ for better communication</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginTop: 24,
  },
  appInfoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
});

export default ProfileScreen;