import ShareableAchievementCard from '@/components/ShareableAchievementCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { generateShareContent, shareToTwitterSpecific, shareToWhatsAppSpecific } from '@/utils/socialSharing';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Example showing Twitter and WhatsApp screenshot sharing capabilities
 */
export default function TwitterWhatsAppScreenshotExample() {

  // Example: Share text to Twitter
  const handleTwitterTextShare = async () => {
    try {
      const content = generateShareContent('workout', {
        duration: '45 minutes',
        exercises: 'Push day workout',
        sets: '4 sets each'
      });

      const success = await shareToTwitterSpecific(content);
      if (success) {
        console.log('Successfully shared to Twitter!');
      }
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      Alert.alert('Error', 'Failed to share to Twitter');
    }
  };

  // Example: Share text to WhatsApp
  const handleWhatsAppTextShare = async () => {
    try {
      const content = generateShareContent('personal_record', {
        exercise: 'Bench Press',
        weight: 225,
        reps: 5
      });

      const success = await shareToWhatsAppSpecific(content);
      if (success) {
        console.log('Successfully shared to WhatsApp!');
      }
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Alert.alert('Error', 'Failed to share to WhatsApp');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        📱 Twitter & WhatsApp Sharing Demo
      </ThemedText>
      
      <ThemedText style={styles.subtitle}>
        Test text and screenshot sharing to Twitter and WhatsApp
      </ThemedText>

      {/* Text Sharing Examples */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Text Sharing</ThemedText>
        
        <TouchableOpacity 
          style={[styles.button, styles.twitterButton]} 
          onPress={handleTwitterTextShare}
        >
          <FontAwesome5 name="twitter" size={20} color="white" />
          <ThemedText style={styles.buttonText}>Share Workout to Twitter</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.whatsappButton]} 
          onPress={handleWhatsAppTextShare}
        >
          <FontAwesome5 name="whatsapp" size={20} color="white" />
          <ThemedText style={styles.buttonText}>Share PR to WhatsApp</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Screenshot Sharing Example */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Screenshot Sharing</ThemedText>
        <ThemedText style={styles.description}>
          Tap the Twitter or WhatsApp buttons below to share a screenshot:
        </ThemedText>
        
        <ShareableAchievementCard
          achievement={{
            title: "New Personal Record! 🏆",
            description: "Just hit 225 lbs on bench press - that's a new PR!",
            icon: "trophy",
            color: "#FF6B35",
            stats: {
              exercise: "Bench Press",
              weight: 225,
              reps: 5,
              duration: "45 min"
            }
          }}
          onShare={(imageUri) => {
            console.log('Achievement card shared with image:', imageUri);
          }}
        />
      </View>

      <View style={styles.infoBox}>
        <FontAwesome5 name="info-circle" size={16} color="#007AFF" />
        <ThemedText style={styles.infoText}>
          Screenshots work great for visual sharing on Twitter and WhatsApp!
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 15,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#007AFF',
  },
});
