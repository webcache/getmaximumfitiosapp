import { Modal } from 'react-native';
import HealthKitSettingsComponent from './HealthKitSettings';

interface HealthKitSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HealthKitSettingsModal({ visible, onClose }: HealthKitSettingsModalProps) {
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <HealthKitSettingsComponent visible={visible} onClose={onClose} />
    </Modal>
  );
}
