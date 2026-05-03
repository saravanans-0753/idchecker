import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, Alert, RefreshControl, ActivityIndicator,
  KeyboardAvoidingView, Platform, SafeAreaView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLocalResidents, saveLocalResidents, deleteLocalResident, type Resident } from '../src/services/storage';
import { createResident, deleteResident as apiDeleteResident } from '../src/services/api';

export default function AdminScreen() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(false);

  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formAadhar, setFormAadhar] = useState('');
  const [formVehicle, setFormVehicle] = useState('');

  useEffect(() => { loadResidents(); }, []);

  const loadResidents = async () => {
    const data = await getLocalResidents();
    setResidents(data);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadResidents();
    setRefreshing(false);
  }, []);

  const handleAddResident = async () => {
    if (!formName.trim() || !formUnit.trim()) {
      Alert.alert('ERROR', 'Name and Unit are required');
      return;
    }
    setLoading(true);
    const customId = formId.trim() || `RES${Date.now().toString().slice(-6)}`;
    const newResident: Resident = {
      id: customId,
      name: formName.trim(),
      unit: formUnit.trim(),
      aadhar_masked: formAadhar.trim(),
      vehicle_plate: formVehicle.trim(),
      photo_base64: '',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await createResident({ id: customId, name: newResident.name, unit: newResident.unit, vehicle_plate: newResident.vehicle_plate });
    } catch (_) {}
    const current = await getLocalResidents();
    current.push(newResident);
    await saveLocalResidents(current);
    await loadResidents();
    resetForm();
    setShowAddModal(false);
    setLoading(false);
  };

  const handleDeleteResident = async (resident: Resident) => {
    Alert.alert('DELETE RESIDENT', `Remove ${resident.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await apiDeleteResident(resident.id); } catch (_) {}
          await deleteLocalResident(resident.id);
          await loadResidents();
          setSelectedResident(null);
        },
      },
    ]);
  };

  const resetForm = () => { setFormId(''); setFormName(''); setFormUnit(''); setFormAadhar(''); setFormVehicle(''); };

  const renderResident = ({ item }: { item: Resident }) => (
    <TouchableOpacity testID={`admin-resident-${item.id}`} style={styles.residentItem} onPress={() => setSelectedResident(item)} activeOpacity={0.7}>
      <View style={styles.residentAvatar}>
        {(item.local_photo || item.photo_url) ? (
          <Image source={{ uri: item.local_photo || item.photo_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.residentInfo}>
        <Text style={styles.residentName}>{item.name}</Text>
        <Text style={styles.residentId}>ID: {item.id}</Text>
        <Text style={styles.residentUnit}>{item.unit}{item.vehicle_plate ? ` • ${item.vehicle_plate}` : ''}</Text>
      </View>
      <View style={[styles.statusBadge, item.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
        <Text style={styles.statusBadgeText}>{item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView testID="admin-screen" style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCount}>{residents.length}</Text>
          <Text style={styles.headerLabel}>TOTAL RESIDENTS</Text>
        </View>
        <TouchableOpacity testID="add-resident-btn" style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>ADD</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.idFormatInfo}>
        <Ionicons name="information-circle" size={16} color="#64748B" />
        <Text style={styles.idFormatText}>ID FORMAT: RES001, RES002... (encode in barcode)</Text>
      </View>

      {residents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>NO RESIDENTS</Text>
          <Text style={styles.emptySubtext}>Sync data or add residents manually</Text>
        </View>
      ) : (
        <FlatList testID="admin-resident-list" data={residents} keyExtractor={(item) => item.id} renderItem={renderResident} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
      )}

      {/* Resident Detail Modal */}
      {selectedResident && (
        <Modal visible={!!selectedResident} animationType="slide" transparent={false} onRequestClose={() => setSelectedResident(null)}>
          <SafeAreaView style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity testID="close-detail-modal" onPress={() => setSelectedResident(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                <Text style={styles.backBtnText}>BACK</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <View style={styles.detailPhoto}>
                {(selectedResident.local_photo || selectedResident.photo_url) ? (
                  <Image source={{ uri: selectedResident.local_photo || selectedResident.photo_url }} style={styles.detailPhotoImg} />
                ) : (
                  <Text style={styles.detailPhotoText}>{selectedResident.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={[styles.detailStatusBadge, selectedResident.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.statusBadgeText}>{selectedResident.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</Text>
              </View>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>RESIDENT ID</Text><Text style={styles.detailValueMono}>{selectedResident.id}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>NAME</Text><Text style={styles.detailValue}>{selectedResident.name}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>FLAT</Text><Text style={styles.detailValue}>{selectedResident.unit}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>AADHAR</Text><Text style={styles.detailValue}>{selectedResident.aadhar_masked || 'N/A'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>VEHICLE</Text><Text style={styles.detailValue}>{selectedResident.vehicle_plate || 'N/A'}</Text></View>
              </View>
              <TouchableOpacity testID="detail-delete-btn" style={styles.deleteButton} onPress={() => handleDeleteResident(selectedResident)}>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>DELETE RESIDENT</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD RESIDENT</Text>
              <TouchableOpacity testID="close-add-modal" onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={28} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <Text style={styles.fieldLabel}>RESIDENT ID (FOR BARCODE)</Text>
              <TextInput testID="input-id" style={styles.input} value={formId} onChangeText={setFormId} placeholder="e.g. RES006" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
              <Text style={styles.fieldLabel}>NAME *</Text>
              <TextInput testID="input-name" style={styles.input} value={formName} onChangeText={setFormName} placeholder="Full Name" placeholderTextColor="#94A3B8" />
              <Text style={styles.fieldLabel}>FLAT / UNIT *</Text>
              <TextInput testID="input-unit" style={styles.input} value={formUnit} onChangeText={setFormUnit} placeholder="e.g. A-101" placeholderTextColor="#94A3B8" />
              <Text style={styles.fieldLabel}>AADHAR (MASKED)</Text>
              <TextInput testID="input-aadhar" style={styles.input} value={formAadhar} onChangeText={setFormAadhar} placeholder="XXXX-XXXX-1234" placeholderTextColor="#94A3B8" />
              <Text style={styles.fieldLabel}>VEHICLE PLATE</Text>
              <TextInput testID="input-vehicle" style={styles.input} value={formVehicle} onChangeText={setFormVehicle} placeholder="e.g. KA 01 AB 1234" placeholderTextColor="#94A3B8" />
            </ScrollView>
            <TouchableOpacity testID="save-resident-btn" style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleAddResident} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>SAVE RESIDENT</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingHorizontal: 24, borderBottomWidth: 2, borderBottomColor: '#000000' },
  headerCount: { fontSize: 36, fontWeight: '900', color: '#000000' },
  headerLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 20, backgroundColor: '#0055FF', borderWidth: 2, borderColor: '#000000' },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  idFormatInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  idFormatText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, fontWeight: '900', color: '#475569', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  listContent: { padding: 12 },
  residentItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  residentAvatar: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0055FF', marginRight: 12, overflow: 'hidden' },
  avatarImage: { width: 48, height: 48 },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '800', color: '#000000' },
  residentId: { fontSize: 12, fontWeight: '700', color: '#0055FF', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  residentUnit: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: '#00C853' },
  badgeInactive: { backgroundColor: '#FF3B30' },
  statusBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  // Detail
  detailContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  detailHeader: { backgroundColor: '#0F172A', padding: 16, paddingHorizontal: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  detailContent: { padding: 24, alignItems: 'center' },
  detailPhoto: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0055FF', borderWidth: 3, borderColor: '#000000', marginBottom: 16, overflow: 'hidden' },
  detailPhotoImg: { width: 140, height: 140 },
  detailPhotoText: { fontSize: 64, fontWeight: '900', color: '#FFFFFF' },
  detailStatusBadge: { paddingHorizontal: 16, paddingVertical: 6, marginBottom: 20 },
  detailCard: { width: '100%', borderWidth: 2, borderColor: '#000000', backgroundColor: '#F8FAFC', padding: 16 },
  detailRow: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 2, marginBottom: 4 },
  detailValue: { fontSize: 18, fontWeight: '900', color: '#000000' },
  detailValueMono: { fontSize: 16, fontWeight: '800', color: '#0055FF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  deleteButton: { width: '100%', height: 56, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 2, borderColor: '#000000', marginTop: 24 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  // Add Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopWidth: 2, borderTopColor: '#000000', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#000000' },
  formScroll: { maxHeight: 400 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 2, marginBottom: 6, marginTop: 14 },
  input: { height: 52, borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 16, fontSize: 16, backgroundColor: '#FFFFFF' },
  saveButton: { height: 60, backgroundColor: '#0055FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000', marginTop: 20 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
