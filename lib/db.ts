import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';

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
  password: string;
  role: UserRole;
  cnic?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Grave {
  id: string;
  graveNumber: string;      // e.g. "A-001"
  section: string;          // e.g. "A", "B", "VIP"
  row: number;
  column: number;
  latitude?: number;        // GIS coordinates
  longitude?: number;
  status: GraveStatus;
  size: 'standard' | 'child' | 'double' | 'vip';
  price: number;            // burial fee in PKR
  occupiedBy?: string;      // deceasedName
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
  burialDate: string;         // date of burial
  burialTime: string;         // time of burial HH:MM
  conductedBy?: string;       // staff member
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
  requestedBy: string;        // userId
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
  reportedBy: string;         // userId
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

export interface DbSchema {
  users: User[];
  graves: Grave[];
  burials: Burial[];
  payments: Payment[];
  certificates: DeathCertificate[];
  maintenance: MaintenanceRequest[];
  notifications: Notification[];
}

// ── Singleton ──────────────────────────────────────────────────────────────────

let _db: Low<DbSchema> | null = null;

const defaultData: DbSchema = {
  users: [],
  graves: [],
  burials: [],
  payments: [],
  certificates: [],
  maintenance: [],
  notifications: [],
};

export async function getDb(): Promise<Low<DbSchema>> {
  if (!_db) {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    const adapter = new JSONFile<DbSchema>(dbPath);
    _db = new Low<DbSchema>(adapter, defaultData);
    await _db.read();
    // Seed initial graves if empty
    if (_db.data.graves.length === 0) {
      _db.data.graves = generateGraves();
      await _db.write();
    }
    // Seed admin if no users
    if (_db.data.users.length === 0) {
      const { hashPassword } = await import('./auth');
      const now = new Date().toISOString();
      _db.data.users.push({
        id: 'admin-001',
        name: 'System Administrator',
        email: 'admin@graveyard.pk',
        password: await hashPassword('Admin@1234'),
        role: 'admin',
        phone: '+92 300 0000000',
        createdAt: now,
        updatedAt: now,
      });
      await _db.write();
    }
  }
  return _db;
}

// ── Grave seeder ───────────────────────────────────────────────────────────────

function generateGraves(): Grave[] {
  const graves: Grave[] = [];
  const sections = ['A', 'B', 'C', 'D', 'VIP'];
  const sizes: Grave['size'][] = ['standard', 'standard', 'standard', 'child', 'double', 'vip'];
  const prices: Record<string, number> = { standard: 15000, child: 8000, double: 25000, vip: 50000 };
  // Base GIS centre (Lahore graveyard coords as example)
  const baseLat = 31.5204;
  const baseLon = 74.3587;
  let idx = 0;

  for (const section of sections) {
    const rows = section === 'VIP' ? 3 : 8;
    const cols = section === 'VIP' ? 5 : 10;
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const size = section === 'VIP' ? 'vip' : sizes[idx % sizes.length];
        const num = String(c).padStart(3, '0');
        graves.push({
          id: `grave-${section}-${r}-${c}`,
          graveNumber: `${section}-${r}${num}`,
          section,
          row: r,
          column: c,
          latitude: baseLat + (r * 0.0001) + (sections.indexOf(section) * 0.001),
          longitude: baseLon + (c * 0.0001),
          status: 'available',
          size,
          price: prices[size],
          createdAt: new Date().toISOString(),
        });
        idx++;
      }
    }
  }
  return graves;
}
