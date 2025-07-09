/**
 * Utility functions for the GetMaximumFit app
 */

import Constants from 'expo-constants';

/**
 * Generates API URL for the given endpoint
 * @param relativePath - The API endpoint path (e.g., '/api/ai/chat')
 * @returns The full API URL
 */
export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === 'development') {
    // In development, try to get the origin from Constants.experienceUrl
    if (Constants.experienceUrl && typeof Constants.experienceUrl === 'string') {
      let origin = Constants.experienceUrl;
      
      // Handle different Expo URL formats
      if (origin.startsWith('exp://')) {
        origin = origin.replace('exp://', 'http://');
      } else if (origin.startsWith('https://')) {
        // Keep HTTPS URLs as-is for tunnel mode
        const fullUrl = origin.concat(path);
        console.log('Generated API URL (HTTPS):', fullUrl);
        return fullUrl;
      }
      
      const fullUrl = origin.concat(path);
      console.log('Generated API URL (development):', fullUrl);
      return fullUrl;
    }
    
    // Fallback for development - use localhost with default Expo port
    const fallbackUrl = `http://localhost:8081${path}`;
    console.log('Using fallback API URL:', fallbackUrl);
    return fallbackUrl;
  }

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL environment variable is not defined',
    );
  }

  const fullUrl = process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
  console.log('Generated production API URL:', fullUrl);
  return fullUrl;
};

/**
 * Format date as MM/DD/YY
 * @param date - Date object to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Validates if a string is a valid email
 * @param email - Email string to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Capitalizes the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
