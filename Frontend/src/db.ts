import { supabase } from './supabase';
import type { DashboardMetrics } from './types';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  age: number;
  gender: string;
  bloodType: string;
  photo: string;
  initials: string;
  address: string;
  time?: string;
  status?: 'Waiting' | 'In Progress' | 'Done';
  vitals?: {
    bloodPressure: string;
    heartRate: number;
    weight: number;
    temperature: number;
    spo2: number;
  };
  allergies?: { trigger: string; reaction: string }[];
  chronicConditions?: string[];
  pastTests?: { name: string; date: string; result: string }[];
  surgicalHistory?: { procedure: string; date: string; outcome: string }[];
  medications?: { name: string; dosage: string; active: boolean }[];
  careTeam?: { name: string; role: string; avatar: string; active: boolean }[];
}

// Local caches
export let patientsCache: Patient[] = [];
export let inventoryCache: { id: string; medicine_name: string; current_stock: number }[] = [];
export let metricsCache: DashboardMetrics = {
  todayAppointmentsCount: 0,
  remainingAppointmentsCount: 0,
  pendingAlternativeMedCount: 0,
  notificationsCount: 0,
  stockAlertsCount: 0
};

// Flag to track if we are using the live Supabase database or falling back to mock data
export let isUsingSupabase = false;

// 12-hour format parser helper
function formatISOToTime12(isoStr: string): string {
  if (!isoStr) return '12:00 PM';
  try {
    const date = new Date(isoStr);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  } catch (e) {
    return '12:00 PM';
  }
}

// Map database status to frontend Patient status
function mapDBStatusToFrontend(status?: string): 'Waiting' | 'In Progress' | 'Done' | undefined {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Done';
  if (status === 'pending') return 'Waiting';
  return undefined;
}

// Map frontend status to database status
function mapFrontendStatusToDB(status?: string): string {
  if (status === 'In Progress') return 'in_progress';
  if (status === 'Done') return 'completed';
  return 'pending';
}

// Primary API: Load all data from Supabase
export async function loadData(): Promise<boolean> {
  try {
    // 1. Fetch profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient');
    
    if (pErr) throw pErr;

    if (!profiles || profiles.length === 0) {
      console.info('Supabase profiles table is empty. Using high-fidelity mock data.');
      isUsingSupabase = false;
      return false;
    }

    // 2. Fetch medical records, appointments, and inventory
    const { data: records, error: rErr } = await supabase.from('medical_records').select('*');
    if (rErr) throw rErr;

    const { data: appts, error: aErr } = await supabase.from('appointments').select('*');
    if (aErr) throw aErr;

    const { data: inventory, error: iErr } = await supabase.from('medicine_inventory').select('*');
    if (iErr) throw iErr;

    const { data: rxItems, error: rxErr } = await supabase
      .from('prescription_items')
      .select('*, medicine_inventory(medicine_name), prescriptions(*)');
    if (rxErr) throw rxErr;

    // 3. Map inventory
    if (inventory && inventory.length > 0) {
      inventoryCache = inventory.map(item => ({
        id: item.id,
        medicine_name: item.medicine_name,
        current_stock: item.current_stock
      }));
    }

    // 4. Map profiles and records into Patient objects
    patientsCache = profiles.map(p => {
      const pRecords = records ? records.filter(r => r.patient_id === p.id) : [];
      const pAppt = appts ? appts.find(a => a.patient_id === p.id) : undefined;

      // Extract demographics JSON
      const demoRec = pRecords.find(r => r.record_type === 'demographics');
      const demo = demoRec ? JSON.parse(demoRec.description) : {};

      // Extract vitals JSON
      const vitalsRec = pRecords.find(r => r.record_type === 'vitals');
      const vitals = vitalsRec ? JSON.parse(vitalsRec.description) : undefined;

      // Extract allergies
      const allergies = pRecords
        .filter(r => r.record_type === 'allergy')
        .map(r => JSON.parse(r.description));

      // Extract chronic conditions
      const chronicConditions = pRecords
        .filter(r => r.record_type === 'chronic_condition')
        .map(r => r.description);

      // Extract past tests
      const pastTests = pRecords
        .filter(r => r.record_type === 'test_result')
        .map(r => JSON.parse(r.description));

      // Extract surgical history
      const surgicalHistory = pRecords
        .filter(r => r.record_type === 'surgical_history')
        .map(r => JSON.parse(r.description));

      // Extract active medications from prescriptions joined items
      const pRxItems = rxItems ? rxItems.filter(item => item.prescriptions?.patient_id === p.id) : [];
      const medications = pRxItems.map(item => ({
        name: item.medicine_inventory?.medicine_name || item.dosage.split(' - ')[0] || 'Unknown',
        dosage: item.dosage,
        active: item.prescriptions?.status === 'active'
      }));

      // Parse appointment details
      let status: 'Waiting' | 'In Progress' | 'Done' | undefined = undefined;
      let time: string | undefined = undefined;

      if (pAppt) {
        status = mapDBStatusToFrontend(pAppt.status);
        time = formatISOToTime12(pAppt.scheduled_time);
      }

      return {
        id: p.id,
        name: p.full_name,
        phone: p.contact_number || '',
        email: demo.email || '',
        dob: demo.dob || '',
        age: demo.age || 0,
        gender: demo.gender || '',
        bloodType: demo.bloodType || 'O+',
        photo: demo.photo || '',
        initials: demo.initials || p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        address: demo.address || '',
        time,
        status,
        vitals,
        allergies,
        chronicConditions,
        pastTests,
        surgicalHistory,
        medications,
        careTeam: [
          {
            name: 'Dr. Smith',
            role: 'Primary Care',
            avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
            active: true
          }
        ]
      };
    });

    // 5. Update Metrics Cache
    const totalToday = appts ? appts.length : 0;
    const remaining = appts ? appts.filter(a => a.status !== 'completed').length : 0;
    const lowStockAlerts = inventory ? inventory.filter(item => item.current_stock <= (item.reorder_threshold || 10)).length : 0;

    metricsCache = {
      todayAppointmentsCount: totalToday,
      remainingAppointmentsCount: remaining,
      pendingAlternativeMedCount: 3, // Mock static
      notificationsCount: 8,      // Mock static
      stockAlertsCount: lowStockAlerts
    };

    isUsingSupabase = true;
    console.info('Successfully loaded all data from Supabase!');
    return true;
  } catch (err) {
    console.error('Failed to load data from Supabase.', err);
    isUsingSupabase = false;
    patientsCache = [];
    metricsCache = {
      todayAppointmentsCount: 0,
      remainingAppointmentsCount: 0,
      pendingAlternativeMedCount: 0,
      notificationsCount: 0,
      stockAlertsCount: 0
    };
    return false;
  }
}

// Add new appointment
export async function addAppointment(
  patientId: string,
  time12: string,
  status: 'Waiting' | 'In Progress' | 'Done'
): Promise<void> {
  const patient = patientsCache.find(p => p.id === patientId);
  if (!patient) return;

  // Format scheduled_time as ISO on today's date
  const [time, modifier] = time12.split(' ');
  let [hoursStr, minutes] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  const today = new Date();
  today.setHours(hours, parseInt(minutes, 10), 0, 0);
  const scheduledTime = today.toISOString();

  // 1. Write to Supabase if active
  if (isUsingSupabase) {
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: patientId,
        doctor_id: '22222222-2222-2222-2222-222222222222', // Dr. Anita Desai
        scheduled_time: scheduledTime,
        status: mapFrontendStatusToDB(status)
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to write appointment to Supabase:', err);
    }
  }

  // 2. Always update local cache for instant visual feedback
  patient.time = time12;
  patient.status = status;

  // Update metrics
  metricsCache.todayAppointmentsCount += 1;
  if (status !== 'Done') {
    metricsCache.remainingAppointmentsCount += 1;
  }
}

// Update appointment status
export async function updateAppointmentStatus(
  patientId: string,
  status: 'Waiting' | 'In Progress' | 'Done'
): Promise<void> {
  const patient = patientsCache.find(p => p.id === patientId);
  if (!patient) return;

  if (isUsingSupabase) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: mapFrontendStatusToDB(status) })
        .eq('patient_id', patientId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update appointment status in Supabase:', err);
    }
  }

  // Update local cache
  const oldStatus = patient.status;
  patient.status = status;

  if (oldStatus === 'Done' && status !== 'Done') {
    metricsCache.remainingAppointmentsCount += 1;
  } else if (oldStatus !== 'Done' && status === 'Done') {
    metricsCache.remainingAppointmentsCount = Math.max(0, metricsCache.remainingAppointmentsCount - 1);
  }
}

// Create new prescription
export async function savePrescription(
  patientId: string,
  rxItems: { name: string; dosage: string; frequency: string; duration: number; durationUnit: string }[]
): Promise<void> {
  const patient = patientsCache.find(p => p.id === patientId);
  if (!patient) return;

  // 1. Write to Supabase
  if (isUsingSupabase) {
    try {
      // Create prescription row
      const { data: rx, error: rxErr } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          doctor_id: '22222222-2222-2222-2222-222222222222',
          status: 'active',
          doctor_comments: 'Prescribed via medconnect portal'
        })
        .select()
        .single();
      
      if (rxErr) throw rxErr;

      // Create prescription items
      for (const item of rxItems) {
        // Find medicine in inventory to reference medicine_id
        const invMed = inventoryCache.find(m => m.medicine_name.toLowerCase() === item.name.toLowerCase());
        const medicineId = invMed ? invMed.id : null;

        const { error: itemErr } = await supabase
          .from('prescription_items')
          .insert({
            prescription_id: rx.id,
            medicine_id: medicineId,
            dosage: `${item.dosage} - ${item.frequency}`,
            quantity: item.duration * 3 // Estimate quantity
          });
        
        if (itemErr) throw itemErr;

        // Deduct inventory stock if available
        if (invMed && invMed.current_stock > 0) {
          const newStock = Math.max(0, invMed.current_stock - (item.duration * 3));
          invMed.current_stock = newStock;
          
          await supabase
            .from('medicine_inventory')
            .update({ current_stock: newStock })
            .eq('id', invMed.id);
        }
      }
    } catch (err) {
      console.error('Failed to save prescription to Supabase:', err);
    }
  }

  // 2. Always update local cache
  patient.medications = rxItems.map(item => ({
    name: item.name,
    dosage: `${item.dosage} - ${item.frequency}`,
    active: true
  }));

  // Deduct inventory cache if not using Supabase
  if (!isUsingSupabase) {
    for (const item of rxItems) {
      const invMed = inventoryCache.find(m => m.medicine_name.toLowerCase() === item.name.toLowerCase());
      if (invMed) {
        invMed.current_stock = Math.max(0, invMed.current_stock - (item.duration * 3));
      }
    }
  }

  // Recalculate stock alerts metric
  metricsCache.stockAlertsCount = inventoryCache.filter(item => item.current_stock <= 10).length;
}
