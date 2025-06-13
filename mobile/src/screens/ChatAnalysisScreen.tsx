import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const ChatAnalysisScreen = () => {
  const [chatText, setChatText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { user } = useAuth();
  const { analyzeChat, analyzeChatImage } = useApi();

  const handleTextAnalysis = async () => {
    if (!chatText.trim()) {
      Alert.alert('Error', 'Please enter some chat text to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeChat(chatText);
      setAnalysis(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze chat');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      analyzeImageChat(result.assets[0].uri);
    }
  };

  const analyzeImageChat = async (imageUri: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeChatImage(imageUri);
      setAnalysis(result);
      setChatText(''); // Clear text input when analyzing image
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getToneColor = (tone: string) => {
    const toneColors: { [key: string]: string } = {
      'positive': '#059669',
      'neutral': '#3b82f6',
      'negative': '#ef4444',
      'mixed': '#f59e0b',
    };
    return toneColors[tone.toLowerCase()] || '#6b7280';
  };

  const getHealthColor = (score: number) => {
    if (score >= 7) return '#059669';
    if (score >= 4) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Analyze Your Chat</Text>
        
        <View style={styles.inputMethods}>
          <TouchableOpacity
            style={styles.methodButton}
            onPress={handleImagePicker}
            disabled={isAnalyzing}
          >
            <Ionicons name="camera" size={24} color="#3b82f6" />
            <Text style={styles.methodText}>Upload Screenshot</Text>
          </TouchableOpacity>
          
          <Text style={styles.orText}>or</Text>
          
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Paste your chat conversation here..."
              multiline
              textAlignVertical="top"
              editable={!isAnalyzing}
            />
          </View>
        </View>

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Text style={styles.imageText}>Image selected for analysis</Text>
            <TouchableOpacity onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.disabledButton]}
          onPress={handleTextAnalysis}
          disabled={isAnalyzing || (!chatText.trim() && !selectedImage)}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Chat</Text>
          )}
        </TouchableOpacity>
      </View>

      {analysis && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Analysis Results</Text>

          {/* Overall Tone */}
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="color-palette" size={20} color={getToneColor(analysis.overallTone)} />
              <Text style={styles.cardTitle}>Overall Tone</Text>
            </View>
            <View style={[styles.tonebadge, { backgroundColor: getToneColor(analysis.overallTone) }]}>
              <Text style={styles.toneBadgeText}>{analysis.overallTone}</Text>
            </View>
            {analysis.toneExplanation && (
              <Text style={styles.explanation}>{analysis.toneExplanation}</Text>
            )}
          </View>

          {/* Relationship Health */}
          {analysis.relationshipHealth && (
            <View style={styles.resultCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="heart" size={20} color={getHealthColor(analysis.relationshipHealth.score)} />
                <Text style={styles.cardTitle}>Relationship Health</Text>
              </View>
              <View style={styles.healthScore}>
                <Text style={[styles.scoreNumber, { color: getHealthColor(analysis.relationshipHealth.score) }]}>
                  {analysis.relationshipHealth.score}/10
                </Text>
              </View>
              {analysis.relationshipHealth.explanation && (
                <Text style={styles.explanation}>{analysis.relationshipHealth.explanation}</Text>
              )}
            </View>
          )}

          {/* Drama Level */}
          {analysis.dramaLevel && (
            <View style={styles.resultCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Drama Level</Text>
              </View>
              <View style={styles.dramaLevel}>
                <Text style={styles.dramaText}>{analysis.dramaLevel}</Text>
              </View>
              {analysis.dramaExplanation && (
                <Text style={styles.explanation}>{analysis.dramaExplanation}</Text>
              )}
            </View>
          )}

          {/* Participants */}
          {analysis.participants && analysis.participants.length > 0 && (
            <View style={styles.resultCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={20} color="#8b5cf6" />
                <Text style={styles.cardTitle}>Participants</Text>
              </View>
              {analysis.participants.map((participant: any, index: number) => (
                <View key={index} style={styles.participantCard}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantTone}>Tone: {participant.tone}</Text>
                  {participant.behavior && (
                    <Text style={styles.participantBehavior}>{participant.behavior}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Communication Tips */}
          {analysis.communicationTips && analysis.communicationTips.length > 0 && (
            <View style={styles.resultCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Communication Tips</Text>
              </View>
              {analysis.communicationTips.map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inputSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputMethods: {
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  methodText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    marginVertical: 12,
  },
  textInputContainer: {
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    minHeight: 120,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageText: {
    color: '#1e40af',
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    padding: 16,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  toneBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  toneBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  healthScore: {
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  dramaLevel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dramaText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f59e0b',
    textTransform: 'capitalize',
  },
  explanation: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  participantCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  participantTone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  participantBehavior: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#f59e0b',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default ChatAnalysisScreen;