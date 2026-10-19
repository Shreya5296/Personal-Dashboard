export interface Package {
  package_id: string;
  student_id: string;
  enrollment_id?: string;
  package_name: string;
  total_classes: number;
  price?: number;
  start_date: string;
  expiry_date?: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | string;
  notes?: string;
  created_at?: string;
}

export interface PackageInput {
  student_id: string;
  enrollment_id?: string;
  package_name: string;
  total_classes: number;
  price?: number;
  start_date: string;
  expiry_date?: string;
  notes?: string;
}

export interface PackageBalanceData {
  totalPurchased: number;
  totalConsumed: number;
  totalRestored: number;
  remainingClasses: number;
}
