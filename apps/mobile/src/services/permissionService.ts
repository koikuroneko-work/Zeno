import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { useEffect, useState } from 'react';

// Permission states
export type LocationPermissionStatus =
  | 'undetermined'  // Permission not yet asked
  | 'denied'        // Permission denied but can ask again
  | 'deniedForever' // Permission denied permanently (can't ask again)
  | 'granted';      // Permission granted

// Convert Expo Location's permission response to our internal status.
function normalizeStatus(status: string, canAskAgain?: boolean): LocationPermissionStatus {
  if (status === 'granted') return 'granted';
  // Expo Location uses 'denied' when the user has denied access and
  // canAskAgain=false when they have permanently denied it.
  if (status === 'undetermined') return 'undetermined';
  if (status === 'denied' && canAskAgain === false) return 'deniedForever';
  return 'denied';
}

// Permission service singleton
class PermissionService {
  private static instance: PermissionService;
  private locationPermissionStatus: LocationPermissionStatus = 'undetermined';
  private listeners: ((status: LocationPermissionStatus) => void)[] = [];
  private checkingPromise: Promise<LocationPermissionStatus> | null = null;

  private constructor() {
    // Check initial permission status on construction.
    this.checkPermissionStatus().catch((err) =>
      console.warn('initial permission check failed', err)
    );
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  // Check current location permission status (idempotent, deduped)
  public async checkPermissionStatus(): Promise<LocationPermissionStatus> {
    if (this.checkingPromise) {
      return this.checkingPromise;
    }

    this.checkingPromise = this.doCheckPermissionStatus().finally(() => {
      this.checkingPromise = null;
    });

    try {
      const status = await this.checkingPromise;
      this.updateStatus(status);
      return status;
    } catch (error) {
      console.warn('Error checking location permission:', error);
      return this.locationPermissionStatus;
    }
  }

  private async doCheckPermissionStatus(): Promise<LocationPermissionStatus> {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return normalizeStatus(status, canAskAgain);
  }

  // Request location permission (Expo Location works cross-platform).
  public async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      const newStatus = normalizeStatus(status, canAskAgain);
      this.updateStatus(newStatus);
      return newStatus;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return this.locationPermissionStatus;
    }
  }

  // Update status and notify listeners
  private updateStatus(status: LocationPermissionStatus): void {
    if (this.locationPermissionStatus !== status) {
      this.locationPermissionStatus = status;
      this.notifyListeners(status);
    }
  }

  // Get current permission status
  public getPermissionStatus(): LocationPermissionStatus {
    return this.locationPermissionStatus;
  }

  // Subscribe to permission status changes
  public subscribe(listener: (status: LocationPermissionStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(status: LocationPermissionStatus): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.warn('Error in permission status listener:', error);
      }
    });
  }

  public isPermissionGranted(): boolean {
    return this.locationPermissionStatus === 'granted';
  }

  public canRequestPermission(): boolean {
    return this.locationPermissionStatus !== 'deniedForever';
  }

  public async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Error opening app settings:', err);
    }
  }
}

// Hook to use permission service
export const useLocationPermission = () => {
  const [status, setStatus] = useState<LocationPermissionStatus>(
    () => PermissionService.getInstance().getPermissionStatus()
  );

  useEffect(() => {
    const service = PermissionService.getInstance();

    service.checkPermissionStatus().catch(console.warn);

    const unsubscribe = service.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return {
    status,
    requestPermission: () => PermissionService.getInstance().requestLocationPermission(),
    openAppSettings: () => PermissionService.getInstance().openAppSettings(),
    isGranted: () => PermissionService.getInstance().isPermissionGranted(),
    canRequest: () => PermissionService.getInstance().canRequestPermission(),
    checkPermission: () => PermissionService.getInstance().checkPermissionStatus(),
  };
};

export const permissionService = PermissionService.getInstance();
