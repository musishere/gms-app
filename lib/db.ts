// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'staff' | 'family';
export type GraveStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';
export type BurialStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'online' | 'bank_transfer' | 'cheque';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';
export type CertificateStatus = 'pending' | 'issued' | 'rejected';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cnic?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grave {
  id: string;
  graveNumber: string;
  section: string;
  row: number;
  column: number;
  latitude?: number;
  longitude?: number;
  status: GraveStatus;
  size: 'standard' | 'child' | 'double' | 'vip';
  price: number;
  occupiedBy?: string;
  burialId?: string;
  lastMaintenanceDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Deceased {
  id: string;
  name: string;
  cnic?: string;
  dateOfBirth?: string;
  dateOfDeath: string;
  causeOfDeath?: string;
  religion?: string;
  nationality?: string;
  address?: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  nextOfKinCNIC?: string;
  relationship?: string;
}

export interface Burial {
  id: string;
  graveId: string;
  deceased: Deceased;
  burialDate: string;
  burialTime: string;
  conductedBy?: string;
  status: BurialStatus;
  notes?: string;
  bookingUserId: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  burialId: string;
  graveId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string;
  paidAt?: string;
  dueDate?: string;
  receiptNumber: string;
  notes?: string;
  createdAt: string;
}

export interface DeathCertificate {
  id: string;
  burialId: string;
  deceasedName: string;
  issuedTo: string;
  requestedBy: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  graveId?: string;
  graveNumber?: string;
  section?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedBy: string;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}
