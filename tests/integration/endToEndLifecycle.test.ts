import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import EnrollmentService from '../../02-backend/apps-script/enrollments/EnrollmentService.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';
// @ts-ignore
import PackageRepository from '../../02-backend/apps-script/packages/PackageRepository.gs';
// @ts-ignore
import FeeService from '../../02-backend/apps-script/fees/FeeService.gs';
// @ts-ignore
import FeeRepository from '../../02-backend/apps-script/fees/FeeRepository.gs';
// @ts-ignore
import PaymentService from '../../02-backend/apps-script/payments/PaymentService.gs';
// @ts-ignore
import ClassService from '../../02-backend/apps-script/classes/ClassService.gs';

describe('Phase 9: Comprehensive End-to-End System Integration', () => {
  let spreadsheet: MockSpreadsheet;
  const admin = { actorId: 'admin_usr', email: 'admin@dashboard.local', requestId: 'req_e2e' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('executes the full student lifecycle from enrollment through payment and credit burn', () => {
    // 1. Create Student
    const stuRes = StudentService.Students_create(spreadsheet, {
      first_name: 'Pooja',
      last_name: 'Menon',
      parent_guardian_name: 'Ramesh Menon',
      parent_email: 'ramesh@synthetic.test',
      primary_phone: '+91 98888 77777',
      city: 'Bengaluru'
    }, admin);
    expect(stuRes.success).toBe(true);
    const stuId = stuRes.data.student_id;

    // 2. Create Enrollment
    const enrRes = EnrollmentService.Enrollments_create(spreadsheet, {
      student_id: stuId,
      enrollment_name: 'Advanced Chemistry - Year 11',
      start_date: '2026-04-01',
      agreed_total_amount: 12000
    }, admin);
    expect(enrRes.success).toBe(true);

    // 3. Purchase 4-class package
    const pkgRes = PackageService.Packages_create(spreadsheet, {
      student_id: stuId,
      package_name: '4-Session Pack',
      purchased_classes: 4,
      package_price: 12000,
      start_date: '2026-04-01'
    }, admin);
    expect(pkgRes.success).toBe(true);
    const pkgId = pkgRes.data.package_id;

    // 4. Create Fee Obligation
    const feeRes = FeeService.FeeObligations_create(spreadsheet, {
      student_id: stuId,
      package_id: pkgId,
      obligation_description: 'Chemistry Term 1 Tuition',
      amount_due: 12000,
      due_date: '2026-04-10'
    }, admin);
    expect(feeRes.success).toBe(true);
    const feeId = feeRes.data.fee_obligation_id;

    // 5. Record Partial Payment (₹6,000)
    const payRes = PaymentService.Payments_record(spreadsheet, {
      student_id: stuId,
      fee_obligation_id: feeId,
      amount: 6000,
      payment_method: 'UPI',
      idempotency_key: 'idem_test_901'
    }, admin);
    expect(payRes.success).toBe(true);

    // Check fee balance: outstanding should be 6000
    const feeRec = FeeRepository.FeeObligations_getById(spreadsheet, feeId);
    const enrichedFee = FeeService.FeeObligations_enrichWithBalances(spreadsheet, feeRec);
    expect(enrichedFee.amount_due).toBe(12000);
    expect(enrichedFee.paid_amount).toBe(6000);
    expect(enrichedFee.outstanding_amount).toBe(6000);
    expect(enrichedFee.obligation_status).toBe('PARTIALLY_PAID');

    // 6. Schedule Class 1 and Attend (credit consumed)
    const cls1 = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      package_id: pkgId,
      class_title: 'Organic Chemistry Intro',
      scheduled_start: '2026-04-02T10:00:00Z',
      scheduled_end: '2026-04-02T11:00:00Z'
    }, admin);
    expect(cls1.success).toBe(true);

    const att1 = ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls1.data.class_session_id,
      attendance_status: 'ATTENDED'
    }, admin);
    expect(att1.success).toBe(true);
    expect(att1.data.class_credit_effect).toBe('CONSUME');

    // 7. Schedule Class 2 and Cancel (0 credit consumed)
    const cls2 = ClassService.Classes_schedule(spreadsheet, {
      student_id: stuId,
      package_id: pkgId,
      class_title: 'Stereochemistry',
      scheduled_start: '2026-04-05T10:00:00Z',
      scheduled_end: '2026-04-05T11:00:00Z'
    }, admin);

    const att2 = ClassService.Classes_complete(spreadsheet, {
      class_session_id: cls2.data.class_session_id,
      attendance_status: 'ABSENT'
    }, admin);
    expect(att2.success).toBe(true);
    expect(att2.data.class_credit_effect).toBe('NO_CONSUME');

    // 8. Verify Package Remaining Classes: 4 purchased - 1 consumed = 3 remaining
    const pkgBal = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(pkgBal.purchased_classes).toBe(4);
    expect(pkgBal.consumed_classes).toBe(1);
    expect(pkgBal.remaining_classes).toBe(3);

    // 9. Restore credit for Class 1
    const restRes = ClassService.Classes_restoreCredit(spreadsheet, {
      class_session_id: cls1.data.class_session_id,
      reason: 'Tutor technical glitch'
    }, admin);
    expect(restRes.success).toBe(true);
    expect(restRes.data.class_credit_effect).toBe('CREDIT_BACK');

    // After restore: remaining classes back to 4
    const pkgBalRestored = PackageService.Packages_enrichWithBalance(spreadsheet, PackageRepository.Packages_getById(spreadsheet, pkgId));
    expect(pkgBalRestored.remaining_classes).toBe(4);

    // 10. Archive student
    const archRes = StudentService.Students_archive(spreadsheet, stuId, admin);
    expect(archRes.success).toBe(true);
    expect(archRes.data.student_status).toBe('INACTIVE');
    expect(archRes.data.archived_at).toBeTruthy();
  });
});
