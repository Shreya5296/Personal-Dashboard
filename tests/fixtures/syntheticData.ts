/**
 * Synthetic Test Data Fixtures
 * Contains purely synthetic test records for development and testing.
 * Never commit real student, guardian, or financial data.
 */

export const SYNTHETIC_STUDENT = {
  student_id: 'stu_synth01',
  first_name: 'Aarav',
  last_name: 'Sharma',
  preferred_name: 'Aaru',
  date_of_birth: '2015-05-12',
  parent_guardian_name: 'Priya Sharma',
  parent_guardian_relationship: 'Mother',
  primary_phone: '+919876543210',
  secondary_phone: '+919876543211',
  parent_email: 'priya.sharma@synthetic-test.local',
  city: 'Bengaluru',
  student_status: 'ACTIVE',
  first_enrollment_date: '2026-01-10',
  last_active_date: '2026-10-18',
  internal_summary: 'Enrolled in 10-class robotics package.',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-10-18T10:00:00.000Z',
  archived_at: '',
  source_reference: 'MIGRATION_BATCH_001'
};

export const SYNTHETIC_ENROLLMENT = {
  enrollment_id: 'enr_synth01',
  student_id: 'stu_synth01',
  enrollment_name: 'Robotics Level 1 - 2026',
  start_date: '2026-01-10',
  end_date: '2026-12-31',
  enrollment_status: 'ACTIVE',
  fee_plan_name: 'Standard Package',
  agreed_total_amount: 12000,
  currency: 'INR',
  billing_notes: 'Paid in 2 installments',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-01-10T10:00:00.000Z',
  closed_at: ''
};

export const SYNTHETIC_PACKAGE = {
  package_id: 'pkg_synth01',
  student_id: 'stu_synth01',
  enrollment_id: 'enr_synth01',
  package_name: '10-Class Robotics Starter',
  purchased_classes: 10,
  package_price: 12000,
  currency: 'INR',
  purchase_date: '2026-01-10',
  start_date: '2026-01-10',
  expiry_date: '2026-07-10',
  package_status: 'ACTIVE',
  notes: 'Includes kit',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-01-10T10:00:00.000Z',
  closed_at: ''
};

export const SYNTHETIC_FEE_OBLIGATION = {
  fee_obligation_id: 'fee_synth01',
  student_id: 'stu_synth01',
  enrollment_id: 'enr_synth01',
  package_id: 'pkg_synth01',
  obligation_description: 'Installment 1 - Robotics Package',
  amount_due: 6000,
  currency: 'INR',
  issue_date: '2026-01-10',
  due_date: '2026-01-20',
  obligation_status: 'PAID',
  notes: 'Installment 1 of 2',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-01-15T12:00:00.000Z',
  voided_at: '',
  void_reason: ''
};

export const SYNTHETIC_PAYMENT = {
  payment_id: 'pay_synth01',
  student_id: 'stu_synth01',
  fee_obligation_id: 'fee_synth01',
  payment_date: '2026-01-15',
  amount: 6000,
  currency: 'INR',
  payment_method: 'UPI',
  transaction_reference: 'UPI/SYNTH/987654321',
  idempotency_key: 'idem_synth_pay01',
  payment_status: 'RECORDED',
  notes: 'Paid via GPay',
  created_at: '2026-01-15T12:00:00.000Z',
  updated_at: '2026-01-15T12:00:00.000Z',
  voided_at: '',
  void_reason: ''
};

export const SYNTHETIC_MEETING_LINK = {
  meeting_link_id: 'ml_synth01',
  student_id: 'stu_synth01',
  provider: 'ZOOM',
  link_label: 'Regular Saturday Class',
  meeting_url: 'https://zoom.us/j/1234567890',
  is_preferred: true,
  link_status: 'ACTIVE',
  valid_from: '2026-01-10',
  valid_until: '',
  notes: 'Passcode sent via WhatsApp',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-01-10T10:00:00.000Z',
  deactivated_at: ''
};

export const SYNTHETIC_CLASS_SESSION = {
  class_session_id: 'cls_synth01',
  student_id: 'stu_synth01',
  enrollment_id: 'enr_synth01',
  package_id: 'pkg_synth01',
  meeting_link_id: 'ml_synth01',
  class_title: 'Class 1: Introduction to Sensors',
  scheduled_start: '2026-01-17T10:00:00.000Z',
  scheduled_end: '2026-01-17T11:00:00.000Z',
  actual_start: '2026-01-17T10:02:00.000Z',
  actual_end: '2026-01-17T11:05:00.000Z',
  session_status: 'COMPLETED',
  attendance_status: 'ATTENDED',
  class_credit_effect: 'CONSUME',
  cancellation_reason: '',
  credit_restoration_for_session_id: '',
  notes: 'Student completed lab activity 1.',
  created_at: '2026-01-10T10:00:00.000Z',
  updated_at: '2026-01-17T11:10:00.000Z',
  completed_at: '2026-01-17T11:10:00.000Z'
};
