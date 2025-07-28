import { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firestore Timestamp, a Date object, or an ISO string to a consistent ISO string format.
 * This ensures that all date/time values stored in Redux are serializable and uniform.
 * @param dateValue The value to convert. Can be a Firestore Timestamp, Date, string, or undefined/null.
 * @param defaultNow If true, returns the current time as an ISO string if dateValue is nullish.
 * @returns An ISO string or null/undefined.
 */
export const serializeTimestamp = (
  dateValue: unknown,
  defaultNow: boolean = false
): string | undefined | null => {
  if (!dateValue) {
    return defaultNow ? new Date().toISOString() : (dateValue as null | undefined);
  }
  if (dateValue instanceof Timestamp) {
    return dateValue.toDate().toISOString();
  }
  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }
  // Assume it's already a string, but validate or re-format if necessary.
  // For simplicity, we'll return it as is. Add validation if needed.
  if (typeof dateValue === 'string') {
    // Basic check to see if it looks like an ISO string
    if (!isNaN(Date.parse(dateValue))) {
      return dateValue;
    }
  }
  // Fallback for unexpected types
  return defaultNow ? new Date().toISOString() : undefined;
};
