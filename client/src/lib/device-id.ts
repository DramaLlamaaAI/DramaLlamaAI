/**
 * Generates and manages a unique device ID for anonymous users
 * This helps track free trial usage before users create an account
 */

// Key used to store the device ID in localStorage
const DEVICE_ID_KEY = 'drama_llama_device_id';

/**
 * Generates a random string to use as device ID
 */
function generateDeviceId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Gets the existing device ID from localStorage or creates a new one
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Clears the device ID (used when a user logs in to prevent
 * them from bypassing the trial by using incognito/different browser)
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}