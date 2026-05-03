import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLocalResidents, saveLocalResidents, type Resident } from '../src/services/storage';
import { createResident, deleteResident as apiDeleteResident } from '../src/services/api';

export default function AdminScreen() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVehicle, setFormVehicle] = useState('');

  useEffect(() => {
    loadResidents();
  }, []);

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
    if (!formName.trim() || !formUnit.trim() || !formPhone.trim()) {
      Alert.alert('ERROR', 'Name, Unit, and Phone are required');
      return;
    }

    setLoading(true);
    try {
      const newResident = await createResident({
        name: formName.trim(),
        unit: formUnit.trim(),
        phone: formPhone.trim(),
        vehicle_plate: formVehicle.trim(),
      });
      // Also save locally
      const current = await getLocalResidents();
      current.push(newResident);
      await saveLocalResidents(current);
      setResidents(current);
      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      // Save locally even if server is offline
      const newResident: Resident = {
        id: `LOCAL_${Date.now()}`,
        name: formName.trim(),
        unit: formUnit.trim(),
        phone: formPhone.trim(),
        vehicle_plate: formVehicle.trim(),
        photo_base64: '',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const current = await getLocalResidents();
      current.push(newResident);
      await saveLocalResidents(current);
      setResidents(current);
      resetForm();
      setShowAddModal(false);
      Alert.alert('SAVED LOCALLY', 'Resident saved offline. Sync when online to upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = (resident: Resident) => {
    Alert.alert(
      'DELETE RESIDENT',
      `Remove ${resident.name} from ${resident.unit}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteResident(resident.id);
            } catch (_) {
              // Offline - proceed with local delete
            }
            const current = await getLocalResidents();
            const updated = current.filter(r => r.id !== resident.id);
            await saveLocalResidents(updated);
            setResidents(updated);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormName('');
    setFormUnit('');
    setFormPhone('');
    setFormVehicle('');
  };

  const renderResident = ({ item }: { item: Resident }) => (
    <View testID={`admin-resident-${item.id}`} style={styles.residentItem}>
      <View style={styles.residentIcon}>
        <Ionicons name="person" size={24} color="#475569" />
      </View>
      <View style={styles.residentInfo}>
        <Text style={styles.residentName}>{item.name}</Text>
        <Text style={styles.residentUnit}>{item.unit} • {item.phone}</Text>
        {item.vehicle_plate ? (
          <Text style={styles.residentVehicle}>{item.vehicle_plate}</Text>
        ) : null}
      </View>
      <View style={styles.residentActions}>
        <View
          style={[
            styles.statusBadge,
            item.status === 'active' ? styles.badgeActive : styles.badgeInactive,
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        <TouchableOpacity
          testID={`delete-resident-${item.id}`}
          onPress={() => handleDeleteResident(item)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View testID="admin-screen" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerCount}>{residents.length}</Text>
          <Text style={styles.headerLabel}>TOTAL RESIDENTS</Text>
        </View>
        <TouchableOpacity
          testID="add-resident-btn"
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Resident List */}
      {residents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>NO RESIDENTS</Text>
          <Text style={styles.emptySubtext}>
            Sync data or add residents manually
          </Text>
        </View>
      ) : (
        <FlatList
          testID="admin-resident-list"
          data={residents}
          keyExtractor={(item) => item.id}
          renderItem={renderResident}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Add Resident Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD RESIDENT</Text>
              <TouchableOpacity
                testID="close-add-modal"
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={28} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <Text style={styles.fieldLabel}>NAME *</Text>
              <TextInput
                testID="input-name"
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>UNIT / FLAT *</Text>
              <TextInput
                testID="input-unit"
                style={styles.input}
                value={formUnit}
                onChangeText={setFormUnit}
                placeholder="e.g. A-101"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>PHONE *</Text>
              <TextInput
                testID="input-phone"
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>VEHICLE PLATE</Text>
              <TextInput
                testID="input-vehicle"
                style={styles.input}
                value={formVehicle}
                onChangeText={setFormVehicle}
                placeholder="e.g. KA 01 AB 1234"
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>

            <TouchableOpacity
              testID="save-resident-btn"
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleAddResident}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>SAVE RESIDENT</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerCount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000000',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: '#0055FF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  residentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  residentIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 12,
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  residentUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  residentVehicle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  residentActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: '#00C853',
  },
  badgeInactive: {
    backgroundColor: '#FF3B30',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  formScroll: {
    maxHeight: 400,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    height: 64,
    backgroundColor: '#0055FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
