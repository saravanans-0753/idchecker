import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLocalResidents, saveLocalResidents, getLastSyncTime, setLastSyncTime } from '../src/services/storage';
import { syncResidents, importFromSheet, getSheetUrl, saveSheetUrl } from '../src/services/api';

export default function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetSaved, setSheetSaved] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    const residents = await getLocalResidents();
    setLocalCount(residents.length);
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
    try {
      const url = await getSheetUrl();
      if (url) { setSheetUrl(url); setSheetSaved(true); }
    } catch (_) {}
  };

  const handleSaveSheetUrl = async () => {
    if (!sheetUrl.trim()) { Alert.alert('ERROR', 'Enter a Google Sheet URL'); return; }
    try {
      await saveSheetUrl(sheetUrl.trim());
      setSheetSaved(true);
      Alert.alert('SAVED', 'Sheet URL configured successfully');
    } catch (e) {
      Alert.alert('ERROR', 'Failed to save URL. Check internet.');
    }
  };

  const handleImportFromSheet = async () => {
    if (!sheetUrl.trim()) { Alert.alert('ERROR', 'Configure a Sheet URL first'); return; }
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      // Step 1: Import from Google Sheet to server
      const importResult = await importFromSheet(sheetUrl.trim());
      
      // Step 2: Sync all data from server to local
      const data = await syncResidents();
      await saveLocalResidents(data.residents);
      await setLastSyncTime(data.synced_at);
      setLocalCount(data.count);
      setLastSync(data.synced_at);
      setSyncResult(`Imported ${importResult.imported} residents from sheet`);
    } catch (error: any) {
      setSyncError('IMPORT FAILED - Check sheet URL & internet');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncLocal = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const data = await syncResidents();
      await saveLocalResidents(data.residents);
      await setLastSyncTime(data.synced_at);
      setLocalCount(data.count);
      setLastSync(data.synced_at);
      setSyncResult(`Synced ${data.count} residents to local`);
    } catch (error: any) {
      setSyncError('SYNC FAILED - Check internet connection');
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView testID="sync-screen" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="folder" size={24} color="#0F172A" />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>LOCAL DATABASE</Text>
              <Text style={styles.statusValue}>{localCount} RESIDENTS</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Ionicons name="time" size={24} color="#0F172A" />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>LAST SYNCED</Text>
              <Text style={styles.statusValue}>{lastSync ? formatSyncTime(lastSync) : 'NEVER'}</Text>
            </View>
          </View>
        </View>

        {/* Google Sheet Configuration */}
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={18} color="#0055FF" />
          <Text style={styles.sectionTitle}>GOOGLE SHEET SOURCE</Text>
        </View>
        <View style={styles.sheetConfig}>
          <Text style={styles.sheetHint}>
            Paste your published Google Sheet URL below.{'\n'}
            Sheet columns: ID, Name, Flat, Aadhar, Photo URL, Validity
          </Text>
          <TextInput
            testID="sheet-url-input"
            style={styles.sheetInput}
            value={sheetUrl}
            onChangeText={(t) => { setSheetUrl(t); setSheetSaved(false); }}
            placeholder="https://docs.google.com/spreadsheets/d/e/..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
          />
          <View style={styles.sheetBtnRow}>
            <TouchableOpacity testID="save-sheet-url-btn" style={styles.saveUrlBtn} onPress={handleSaveSheetUrl}>
              <Text style={styles.saveUrlText}>{sheetSaved ? '✓ SAVED' : 'SAVE URL'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Import from Sheet Button */}
        <TouchableOpacity
          testID="import-sheet-btn"
          style={[styles.importBtn, syncing && styles.btnDisabled]}
          onPress={handleImportFromSheet}
          disabled={syncing}
        >
          {syncing ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Ionicons name="cloud-download" size={24} color="#FFFFFF" />
              <Text style={styles.importBtnText}>PULL FROM SHEET</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sync from server (if data already imported) */}
        <TouchableOpacity
          testID="sync-button"
          style={[styles.syncLocalBtn, syncing && styles.btnDisabled]}
          onPress={handleSyncLocal}
          disabled={syncing}
        >
          <Ionicons name="refresh" size={20} color="#0055FF" />
          <Text style={styles.syncLocalText}>SYNC FROM SERVER</Text>
        </TouchableOpacity>

        {/* Messages */}
        {syncResult && (
          <View testID="sync-success" style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#00C853" />
            <Text style={styles.successText}>{syncResult}</Text>
          </View>
        )}
        {syncError && (
          <View testID="sync-error" style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{syncError}</Text>
          </View>
        )}

        <View style={styles.offlineNote}>
          <Ionicons name="wifi-outline" size={18} color="#FFB300" />
          <Text style={styles.offlineText}>INTERNET REQUIRED ONLY FOR SYNC</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20 },
  statusCard: { borderWidth: 2, borderColor: '#000000', padding: 16, backgroundColor: '#F8FAFC', marginBottom: 24, elevation: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 2 },
  statusValue: { fontSize: 18, fontWeight: '900', color: '#000000', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0055FF', letterSpacing: 1 },
  sheetConfig: { borderWidth: 1, borderColor: '#E2E8F0', padding: 14, backgroundColor: '#F8FAFC', marginBottom: 16 },
  sheetHint: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  sheetInput: { borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#FFFFFF', minHeight: 56 },
  sheetBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  saveUrlBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0F172A' },
  saveUrlText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  importBtn: { height: 64, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, borderWidth: 2, borderColor: '#000000', marginBottom: 12 },
  importBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  syncLocalBtn: { height: 48, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 2, borderColor: '#0055FF', marginBottom: 16 },
  syncLocalText: { color: '#0055FF', fontSize: 13, fontWeight: '900' },
  btnDisabled: { opacity: 0.6 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#00C853', marginBottom: 12 },
  successText: { fontSize: 13, fontWeight: '700', color: '#00C853', flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FF3B30', marginBottom: 12 },
  errorText: { fontSize: 13, fontWeight: '700', color: '#FF3B30', flex: 1 },
  offlineNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  offlineText: { fontSize: 11, fontWeight: '700', color: '#FFB300', letterSpacing: 1 },
});
