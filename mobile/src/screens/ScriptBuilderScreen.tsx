import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const ScriptBuilderScreen = () => {
  const [situation, setSituation] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scripts, setScripts] = useState<any>(null);
  const [savedScripts, setSavedScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const { user } = useAuth();
  const { generateScript, getSavedScripts, saveScript, deleteScript } = useApi();

  useEffect(() => {
    loadSavedScripts();
  }, []);

  const loadSavedScripts = async () => {
    try {
      const scripts = await getSavedScripts();
      setSavedScripts(scripts);
    } catch (error) {
      console.error('Failed to load saved scripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateScripts = async () => {
    if (!situation.trim() || !originalMessage.trim()) {
      Alert.alert('Error', 'Please fill in both the situation and original message');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateScript(situation, originalMessage);
      setScripts(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate scripts');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, scriptType: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${scriptType} script copied to clipboard`);
  };

  const handleSaveScript = async () => {
    if (!scripts) return;

    try {
      await saveScript({
        title: `Script for: ${situation.substring(0, 30)}...`,
        situation,
        originalMessage,
        firmScript: scripts.firm,
        neutralScript: scripts.neutral,
        empathicScript: scripts.empathic,
        situationAnalysis: scripts.analysis || '',
      });
      Alert.alert('Success', 'Script saved successfully!');
      await loadSavedScripts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save script');
    }
  };

  const handleDeleteScript = async (scriptId: number) => {
    Alert.alert(
      'Delete Script',
      'Are you sure you want to delete this script?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScript(scriptId);
              await loadSavedScripts();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete script');
            }
          },
        },
      ]
    );
  };

  const renderCreateTab = () => (
    <View style={styles.createSection}>
      <Text style={styles.sectionTitle}>Generate Communication Scripts</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Describe the Situation</Text>
        <TextInput
          style={styles.textInput}
          value={situation}
          onChangeText={setSituation}
          placeholder="e.g., My partner is upset about me working late again..."
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Original Message/Response</Text>
        <TextInput
          style={styles.textInput}
          value={originalMessage}
          onChangeText={setOriginalMessage}
          placeholder="e.g., I have to work late, deal with it..."
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.disabledButton]}
        onPress={handleGenerateScripts}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.generateButtonText}>Generate Scripts</Text>
        )}
      </TouchableOpacity>

      {scripts && (
        <View style={styles.scriptsContainer}>
          <View style={styles.scriptsHeader}>
            <Text style={styles.scriptsTitle}>Generated Scripts</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveScript}
            >
              <Ionicons name="save" size={16} color="white" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scriptCard}>
            <View style={[styles.scriptHeader, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="shield" size={20} color="#dc2626" />
              <Text style={[styles.scriptType, { color: '#dc2626' }]}>Firm & Direct</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(scripts.firm, 'Firm')}
                style={styles.copyButton}
              >
                <Ionicons name="copy" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
            <Text style={styles.scriptText}>{scripts.firm}</Text>
          </View>

          <View style={styles.scriptCard}>
            <View style={[styles.scriptHeader, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="pencil" size={20} color="#2563eb" />
              <Text style={[styles.scriptType, { color: '#2563eb' }]}>Neutral & Balanced</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(scripts.neutral, 'Neutral')}
                style={styles.copyButton}
              >
                <Ionicons name="copy" size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
            <Text style={styles.scriptText}>{scripts.neutral}</Text>
          </View>

          <View style={styles.scriptCard}>
            <View style={[styles.scriptHeader, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="heart" size={20} color="#16a34a" />
              <Text style={[styles.scriptType, { color: '#16a34a' }]}>Empathic & Understanding</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(scripts.empathic, 'Empathic')}
                style={styles.copyButton}
              >
                <Ionicons name="copy" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>
            <Text style={styles.scriptText}>{scripts.empathic}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderSavedTab = () => (
    <View style={styles.savedSection}>
      <Text style={styles.sectionTitle}>Saved Scripts ({savedScripts.length})</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : savedScripts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Saved Scripts</Text>
          <Text style={styles.emptyText}>
            Generate and save scripts in the Create tab to see them here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.savedList}>
          {savedScripts.map((script) => (
            <View key={script.id} style={styles.savedScriptCard}>
              <View style={styles.savedScriptHeader}>
                <Text style={styles.savedScriptTitle}>{script.title}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteScript(script.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.savedScriptSituation}>
                Situation: {script.situation}
              </Text>
              
              <View style={styles.savedScriptActions}>
                <TouchableOpacity
                  onPress={() => copyToClipboard(script.firmScript, 'Firm')}
                  style={[styles.scriptActionButton, { backgroundColor: '#fee2e2' }]}
                >
                  <Text style={[styles.scriptActionText, { color: '#dc2626' }]}>Firm</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => copyToClipboard(script.neutralScript, 'Neutral')}
                  style={[styles.scriptActionButton, { backgroundColor: '#dbeafe' }]}
                >
                  <Text style={[styles.scriptActionText, { color: '#2563eb' }]}>Neutral</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => copyToClipboard(script.empathicScript, 'Empathic')}
                  style={[styles.scriptActionButton, { backgroundColor: '#dcfce7' }]}
                >
                  <Text style={[styles.scriptActionText, { color: '#16a34a' }]}>Empathic</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
            Create Scripts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved Scripts ({savedScripts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'create' ? renderCreateTab() : renderSavedTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  createSection: {
    padding: 16,
  },
  savedSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 100,
  },
  generateButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scriptsContainer: {
    marginTop: 16,
  },
  scriptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scriptsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  scriptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  scriptType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  scriptText: {
    padding: 16,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  savedList: {
    flex: 1,
  },
  savedScriptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  savedScriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedScriptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  savedScriptSituation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  savedScriptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scriptActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  scriptActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ScriptBuilderScreen;