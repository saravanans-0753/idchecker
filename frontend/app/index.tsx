import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  AppState,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  getResidentById,
  getLocalResidents,
  addAccessLog,
  type Resident,
  type AccessLogEntry,
} from '../src/services/storage';
import { postAccessLog } from '../src/services/api';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resident, setResident] = useState<Resident | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [residentCount, setResidentCount] = useState(0);

  // Load resident count on mount and when app state changes
  useEffect(() => {
    loadResidentCount();
    
    // Reload count when app comes to foreground or component becomes visible
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadResidentCount();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Also reload count when returning from result screen
  useEffect(() => {
    if (!showResult) {
      loadResidentCount();
    }
  }, [showResult]);

  const loadResidentCount = async () => {
    const residents = await getLocalResidents();
    setResidentCount(residents.length);
  };

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    await lookupResident(data.trim());
    setLoading(false);
  }, [scanned]);

  const lookupResident = async (id: string) => {
    const found = await getResidentById(id);
    if (found) {
      setResident(found);
      setNotFound(false);
      const logEntry: AccessLogEntry = {
        id: Date.now().toString(),
        resident_id: found.id,
        resident_name: found.name,
        unit: found.unit,
        timestamp: new Date().toISOString(),
        status: found.status === 'active' ? 'verified' : 'denied',
      };
      await addAccessLog(logEntry);
      try {
        await postAccessLog({
          resident_id: found.id,
          resident_name: found.name,
          unit: found.unit,
          status: logEntry.status,
        });
      } catch (_) {}
    } else {
      setResident(null);
      setNotFound(true);
    }
    setShowResult(true);
  };

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;
    setLoading(true);
    await lookupResident(manualId.trim());
    setLoading(false);
    setManualId('');
  };

  const resetScan = () => {
    setScanned(false);
    setShowResult(false);
    setResident(null);
    setNotFound(false);
    loadResidentCount();
  };

  // Show result screen (full screen overlay)
  if (showResult) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultFullScreen}>
          {notFound ? (
            <View style={styles.resultContent}>
              <View style={[styles.statusBanner, styles.deniedBanner]}>
                <Ionicons name="close-circle" size={48} color="#FFFFFF" />
                <Text style={styles.bannerText}>NOT FOUND</Text>
              </View>
              <Text style={styles.notFoundText}>
                No resident found with this ID.{'\n'}Verify the barcode or contact admin.
              </Text>
            </View>
          ) : resident ? (
            <View style={styles.resultContent}>
              <View
                style={[
                  styles.statusBanner,
                  resident.status === 'active' ? styles.verifiedBanner : styles.deniedBanner,
                ]}
              >
                <Ionicons
                  name={resident.status === 'active' ? 'checkmark-circle' : 'ban'}
                  size={48}
                  color="#FFFFFF"
                />
                <Text style={styles.bannerText}>
                  {resident.status === 'active' ? 'VERIFIED' : 'INACTIVE'}
                </Text>
              </View>

              {/* Photo */}
              <View style={styles.photoContainer}>
                {resident.photo_base64 ? (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoInitial}>
                      {resident.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoInitial}>
                      {resident.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Details */}
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>NAME</Text>
                  <Text testID="resident-name" style={styles.detailValue}>{resident.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UNIT / FLAT</Text>
                  <Text testID="resident-unit" style={styles.detailValue}>{resident.unit}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PHONE</Text>
                  <Text testID="resident-phone" style={styles.detailValue}>{resident.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>VEHICLE</Text>
                  <Text testID="resident-vehicle" style={styles.detailValue}>
                    {resident.vehicle_plate || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>RESIDENT ID</Text>
                  <Text testID="resident-id-display" style={styles.detailValueMono}>{resident.id}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            testID="close-result-btn"
            style={styles.closeButton}
            onPress={resetScan}
          >
            <Ionicons name="scan" size={24} color="#FFFFFF" />
            <Text style={styles.closeButtonText}>SCAN NEXT</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Permission not determined yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0055FF" />
      </View>
    );
  }

  // Permission denied - show manual entry
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, residentCount > 0 ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>
            {residentCount} RESIDENTS IN LOCAL DB
          </Text>
        </View>

        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={56} color="#0F172A" />
          <Text style={styles.permissionTitle}>CAMERA ACCESS</Text>
          <Text style={styles.permissionText}>
            Grant camera to scan barcodes
          </Text>
          <TouchableOpacity
            testID="grant-camera-permission-btn"
            style={styles.actionButton}
            onPress={requestPermission}
          >
            <Text style={styles.actionButtonText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Entry */}
        <View style={styles.manualSection}>
          <Text style={styles.manualLabel}>MANUAL ID ENTRY</Text>
          <View style={styles.manualRow}>
            <TextInput
              testID="manual-id-input"
              style={styles.manualInput}
              value={manualId}
              onChangeText={setManualId}
              placeholder="e.g. RES001"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              testID="manual-lookup-btn"
              style={styles.lookupBtn}
              onPress={handleManualLookup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.lookupBtnText}>LOOK UP</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view with scanner
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, residentCount > 0 ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.statusText}>
          {residentCount} RESIDENTS IN LOCAL DB
        </Text>
      </View>

      {!scanned && (
        <View style={styles.cameraContainer}>
          <CameraView
            testID="barcode-camera"
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>ALIGN BARCODE WITHIN FRAME</Text>
          </View>
        </View>
      )}

      {scanned && loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0055FF" />
          <Text style={styles.loadingText}>LOOKING UP...</Text>
        </View>
      )}

      {/* Manual Entry */}
      <View style={styles.manualSection}>
        <Text style={styles.manualLabel}>MANUAL ID ENTRY</Text>
        <View style={styles.manualRow}>
          <TextInput
            testID="manual-id-input-scanner"
            style={styles.manualInput}
            value={manualId}
            onChangeText={setManualId}
            placeholder="Enter Resident ID"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
          />
          <TouchableOpacity
            testID="manual-lookup-btn-scanner"
            style={styles.lookupBtn}
            onPress={handleManualLookup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="search" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#00C853',
  },
  dotOffline: {
    backgroundColor: '#FFB300',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewfinder: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanHint: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  manualSection: {
    padding: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#FFFFFF',
  },
  lookupBtn: {
    width: 80,
    height: 56,
    backgroundColor: '#0055FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  lookupBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 6,
  },
  actionButton: {
    marginTop: 20,
    height: 56,
    paddingHorizontal: 28,
    backgroundColor: '#0055FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Full screen result
  resultFullScreen: {
    flexGrow: 1,
    padding: 20,
  },
  resultContent: {
    flex: 1,
  },
  statusBanner: {
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  verifiedBanner: {
    backgroundColor: '#00C853',
  },
  deniedBanner: {
    backgroundColor: '#FF3B30',
  },
  bannerText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  notFoundText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0055FF',
  },
  photoInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  detailCard: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  detailValueMono: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeButton: {
    height: 64,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
