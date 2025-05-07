/**
 * Utilities for generating and managing device IDs
 */

const DEVICE_ID_KEY = 'dramallama_device_id';

/**
 * Generate a random device ID
 */
function generateDeviceId(): string {
  const timestamp = new Date().getTime().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomStr}`;
}

/**
 * Get the device ID or create one if it doesn't exist
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}