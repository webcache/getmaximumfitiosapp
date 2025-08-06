import React from 'react';
import { Modal } from 'react-native';
import ActiveWorkoutScreen from './ActiveWorkoutScreen';
import { Workout } from './WorkoutModal';

interface WorkoutSessionModalProps {
  visible: boolean;
  workout: Workout | null;
  onComplete: (completedWorkout: Workout) => void;
  onClose: () => void;
}

export default function WorkoutSessionModal({
  visible,
  workout,
  onComplete,
  onClose,
}: WorkoutSessionModalProps) {
  if (!workout) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <ActiveWorkoutScreen
        workout={workout}
        onComplete={onComplete}
        onExit={onClose}
      />
    </Modal>
  );
}
