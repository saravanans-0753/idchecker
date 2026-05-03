import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
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
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    loadResidentCount();
    const interval = setInterval(loadResidentCount, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadResidentCount();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!showResult) loadResidentCount();
  }, [showResult]);

  const loadResidentCount = async () => {
    const residents = await getLocalResidents();
    setResidentCount(residents.length);
  };

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;
    setLoading(true);
    await loadResidentCount();
    await lookupResident(manualId.trim());
    setLoading(false);
    setManualId('');
  };

  const handleCaptureAndScan = async () => {
    if (!cameraRef.current) return;
    try {
      setLoading(true);
      // Take photo - the barcode scanner will handle it via onBarcodeScanned
      // This is a fallback for when live scanning isn't detecting
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3 });
      // Photo is discarded immediately - barcode scanning is handled by the live feed
      // If no barcode detected from live feed, prompt manual entry
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
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

  const resetScan = () => {
    setScanned(false);
    setShowResult(false);
    setResident(null);
    setNotFound(false);
    loadResidentCount();
  };

  // RESULT SCREEN - full screen portrait photo
  if (showResult) {
    return (
      <SafeAreaView style={styles.container}>
        {notFound ? (
          <View style={styles.resultFull}>
            <View style={[styles.statusBanner, styles.deniedBanner]}>
              <Ionicons name="close-circle" size={48} color="#FFFFFF" />
              <Text style={styles.bannerText}>NOT FOUND</Text>
            </View>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24}}>
              <Text style={styles.notFoundText}>
                No resident found with this ID.{'\n'}Verify the barcode or contact admin.
              </Text>
            </View>
            <TouchableOpacity testID="close-result-btn" style={styles.scanNextBtn} onPress={resetScan}>
              <Text style={styles.scanNextText}>SCAN NEXT</Text>
            </TouchableOpacity>
          </View>
        ) : resident ? (
          <View style={styles.resultFull}>
            {/* Status Banner - thin */}
            <View
              style={[
                styles.statusBanner,
                resident.status === 'active' ? styles.verifiedBanner : styles.deniedBanner,
              ]}
            >
              <Ionicons
                name={resident.status === 'active' ? 'checkmark-circle' : 'ban'}
                size={28}
                color="#FFFFFF"
              />
              <Text style={styles.bannerText}>
                {resident.status === 'active' ? 'VERIFIED' : 'INACTIVE'}
              </Text>
            </View>

            {/* FULL SCREEN PORTRAIT PHOTO - takes all remaining space */}
            <View style={styles.photoFull}>
              {(resident.local_photo || resident.photo_url || resident.photo_base64) ? (
                <Image
                  testID="resident-photo"
                  source={{ uri: resident.local_photo || resident.photo_url || resident.photo_base64 }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Text style={styles.photoFullInitial}>
                    {resident.name.charAt(0).toUpperCase()}
                  </Text>
                  <Text style={styles.photoName}>{resident.name}</Text>
                </>
              )}
            </View>

            {/* Resident Name */}
            <View style={styles.nameBar}>
              <Text testID="resident-name" style={styles.nameText}>{resident.name}</Text>
            </View>

            {/* Single compact info bar */}
            <View style={styles.infoBar}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ID</Text>
                <Text testID="resident-id-display" style={styles.infoValue}>{resident.id}</Text>
              </View>
              <View style={styles.infoSep} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>FLAT</Text>
                <Text testID="resident-unit" style={styles.infoValue}>{resident.unit}</Text>
              </View>
              <View style={styles.infoSep} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>AADHAR</Text>
                <Text testID="resident-aadhar" style={styles.infoValue}>{resident.aadhar_masked || 'N/A'}</Text>
              </View>
            </View>
            {resident.vehicle_plate ? (
              <View style={styles.vehicleBar}>
                <Ionicons name="car" size={16} color="#475569" />
                <Text testID="resident-vehicle" style={styles.vehicleText}>{resident.vehicle_plate}</Text>
              </View>
            ) : null}

            <TouchableOpacity testID="close-result-btn" style={styles.scanNextBtn} onPress={resetScan}>
              <Ionicons name="scan" size={20} color="#FFFFFF" />
              <Text style={styles.scanNextText}>SCAN NEXT</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  // Permission not ready
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
          <Text style={styles.statusText}>{residentCount} RESIDENTS IN LOCAL DB</Text>
        </View>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={56} color="#0F172A" />
          <Text style={styles.permissionTitle}>CAMERA ACCESS</Text>
          <Text style={styles.permissionText}>Grant camera to scan barcodes</Text>
          <TouchableOpacity testID="grant-camera-permission-btn" style={styles.actionButton} onPress={requestPermission}>
            <Text style={styles.actionButtonText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity testID="manual-lookup-btn" style={styles.lookupBtn} onPress={handleManualLookup} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.lookupBtnText}>LOOK UP</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera scanner
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, residentCount > 0 ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.statusText}>{residentCount} RESIDENTS IN LOCAL DB</Text>
      </View>
      {!scanned && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            testID="barcode-camera"
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }}
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
            <TouchableOpacity testID="capture-scan-btn" style={styles.captureBtn} onPress={handleCaptureAndScan}>
              <Ionicons name="camera" size={28} color="#FFFFFF" />
              <Text style={styles.captureBtnText}>CAPTURE & SCAN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {scanned && loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0055FF" />
          <Text style={styles.loadingText}>LOOKING UP...</Text>
        </View>
      )}
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
          <TouchableOpacity testID="manual-lookup-btn-scanner" style={styles.lookupBtn} onPress={handleManualLookup} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="search" size={22} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  statusBar: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 24, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotOnline: { backgroundColor: '#00C853' },
  dotOffline: { backgroundColor: '#FFB300' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#475569', letterSpacing: 1 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  viewfinder: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFFFFF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanHint: { marginTop: 24, color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  captureBtn: { marginTop: 32, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0055FF', paddingHorizontal: 24, paddingVertical: 16, borderWidth: 2, borderColor: '#FFFFFF' },
  captureBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#475569' },
  manualSection: { padding: 16, paddingHorizontal: 24, backgroundColor: '#F8FAFC', borderTopWidth: 2, borderTopColor: '#000000' },
  manualLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 2, marginBottom: 8 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: { flex: 1, height: 56, borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 16, fontSize: 18, fontWeight: '700', backgroundColor: '#FFFFFF' },
  lookupBtn: { width: 80, height: 56, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000' },
  lookupBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 16 },
  permissionText: { fontSize: 15, color: '#475569', marginTop: 6 },
  actionButton: { marginTop: 20, height: 56, paddingHorizontal: 28, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000' },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  // Result screen
  resultFull: { flex: 1 },
  statusBanner: { height: 52, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  verifiedBanner: { backgroundColor: '#00C853' },
  deniedBanner: { backgroundColor: '#FF3B30' },
  bannerText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  notFoundText: { fontSize: 16, color: '#475569', textAlign: 'center', lineHeight: 24 },
  photoFull: { flex: 1, width: '100%', backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center' },
  photoImage: { width: '100%', height: '100%' },
  photoFullInitial: { fontSize: 200, fontWeight: '900', color: '#FFFFFF', opacity: 0.9 },
  photoName: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: -10 },
  nameBar: { backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  nameText: { fontSize: 22, fontWeight: '900', color: '#000000', textAlign: 'center' },
  infoBar: { flexDirection: 'row', backgroundColor: '#0F172A', paddingVertical: 10, paddingHorizontal: 12 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 },
  infoValue: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  infoSep: { width: 1, backgroundColor: '#334155' },
  vehicleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  vehicleText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  scanNextBtn: { height: 52, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  scanNextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
