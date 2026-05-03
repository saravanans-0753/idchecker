import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getLocalResidents,
  saveLocalResidents,
  getLastSyncTime,
  setLastSyncTime,
} from '../src/services/storage';
import { syncResidents } from '../src/services/api';

export default function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const residents = await getLocalResidents();
    setLocalCount(residents.length);
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const data = await syncResidents();
      await saveLocalResidents(data.residents);
      await setLastSyncTime(data.synced_at);
      setLocalCount(data.count);
      setLastSync(data.synced_at);
      setSyncResult(`Successfully synced ${data.count} residents`);
    } catch (error: any) {
      setSyncError('SYNC FAILED - Check internet connection');
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View testID="sync-screen" style={styles.container}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons name="folder" size={28} color="#0F172A" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>LOCAL DATABASE</Text>
            <Text style={styles.statusValue}>{localCount} RESIDENTS</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statusRow}>
          <Ionicons name="time" size={28} color="#0F172A" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>LAST SYNCED</Text>
            <Text style={styles.statusValue}>
              {lastSync ? formatSyncTime(lastSync) : 'NEVER'}
            </Text>
          </View>
        </View>
      </View>

      {/* Sync Button */}
      <TouchableOpacity
        testID="sync-button"
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="cloud-download" size={32} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>PULL LATEST DATA</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.syncHint}>
        Downloads all resident data from server to local storage.
        {'\n'}App works offline after sync.
      </Text>

      {/* Result Messages */}
      {syncResult && (
        <View testID="sync-success" style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={24} color="#00C853" />
          <Text style={styles.successText}>{syncResult}</Text>
        </View>
      )}

      {syncError && (
        <View testID="sync-error" style={styles.errorBox}>
          <Ionicons name="alert-circle" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{syncError}</Text>
        </View>
      )}

      {/* Offline indicator */}
      <View style={styles.offlineNote}>
        <Ionicons name="wifi-outline" size={20} color="#FFB300" />
        <Text style={styles.offlineText}>
          INTERNET REQUIRED ONLY FOR SYNC
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  statusCard: {
    borderWidth: 2,
    borderColor: '#000000',
    padding: 24,
    backgroundColor: '#F8FAFC',
    marginBottom: 32,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  syncButton: {
    height: 80,
    backgroundColor: '#0055FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  syncHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#00C853',
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00C853',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
    flex: 1,
  },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 24,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB300',
    letterSpacing: 1,
  },
});
