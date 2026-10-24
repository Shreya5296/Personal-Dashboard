export interface Package {
  package_id: string;
  student_id: string;
  student_name?: string;
  plan_name?: string;
  plan_type?: string;
  package_name: string;
  total_classes: number;
  classes_purchased?: number;
  purchased_classes?: number;
  consumed_classes?: number;
  remaining_classes?: number;
  price?: number;
  package_price?: number;
  per_class?: number;
  currency?: string;
  start_date: string;
  expiry_date?: string;
  next_due_date?: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | string;
  package_status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PackageInput {
  student_id: string;
  student_name?: string;
  plan_name?: string;
  plan_type?: string;
  package_name: string;
  total_classes: number;
  classes_purchased?: number;
  price?: number;
  package_price?: number;
  per_class?: number;
  currency?: string;
  start_date: string;
  end_date?: string;
  expiry_date?: string;
  next_due_date?: string;
  notes?: string;
}

export interface PackageBalanceData {
  totalPurchased: number;
  totalConsumed: number;
  totalRestored: number;
  remainingClasses: number;
}
