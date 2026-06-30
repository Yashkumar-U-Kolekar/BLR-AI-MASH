export type ProfileRole = 'patient' | 'doctor' | 'nurse' | 'admin';
export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type PrescriptionStatus = 'pending_check' | 'active' | 'completed' | 'pushed_to_pharma' | 'alternative_requested' | 'fulfilled';

export interface Profile {
  id: string;
  full_name: string;
  role: ProfileRole;
  contact_number?: string | null;
  created_at: string;
}

export interface DoctorDetails {
  doctor_id: string;
  specialty: string;
  room_number?: string | null;
  is_available: boolean;
  last_updated: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  record_type: string; // 'Condition', 'Allergy', 'Vital', 'Test', 'Surgery'
  description: string;
  record_date: string;
  created_at: string;
  metadata?: any;
}

export interface MedicineInventory {
  id: string;
  medicine_name: string;
  current_stock: number;
  reorder_threshold: number;
  repeatedly_used: boolean;
  last_updated: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: PrescriptionStatus;
  doctor_comments?: string | null;
  created_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_id: string;
  dosage: string;
  quantity: number;
}

export interface DashboardMetrics {
  todayAppointmentsCount: number;
  remainingAppointmentsCount: number;
  pendingAlternativeMedCount: number;
  notificationsCount: number;
  stockAlertsCount: number;
}
