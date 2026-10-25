import { describe, it, expect, beforeEach } from 'vitest';
import { validateRegistrationForm } from '../../src/domains/students/registrationValidation';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';
import {
  AVAILABLE_SUBJECTS,
  parseSubjectList,
} from '../../src/domains/students/subjectConstants';
import {
  adaptStudentInput,
  enrichStudentData,
} from '../../src/domains/students/studentApi';
import { calculatePerClassRate } from '../../src/domains/packages/packageCalculations';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';
// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import PackageService from '../../02-backend/apps-script/packages/PackageService.gs';

describe('Registration Controls and UI Polish', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_polish' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  describe('1. Student Phone & Student Email Optional & Editable', () => {
    it('accepts empty student phone and empty student email during registration', () => {
      const form: RegistrationFormData = {
        student: { student_name: 'Aarav Patel', subject: 'Math', student_phone: '', student_email: '' },
        parent: { parent_name: 'Karan Patel', parent_phone: '+91 98765 00000', parent_email: '' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '25000', per_class: '1250', classes_purchased: '20', class_duration: '60' },
        schedules: [],
        first_class_date: '2026-11-02',
      };
      const res = validateRegistrationForm(form);
      expect(res.isValid).toBe(true);
      expect(res.errors.student).toBeUndefined();
    });

    it('accepts valid international student phone numbers and valid emails', () => {
      const form: RegistrationFormData = {
        student: {
          student_name: 'Diya Sen',
          subject: 'English',
          student_phone: '+1 (415) 555-0199',
          student_email: 'diya.sen@student.school.edu',
        },
        parent: { parent_name: 'Anita Sen', parent_phone: '+91 98222 11111', parent_email: 'anita@example.com' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '', class_duration: '60' },
        schedules: [],
        first_class_date: '2026-11-02',
      };
      const res = validateRegistrationForm(form);
      expect(res.isValid).toBe(true);
    });

    it('rejects invalid nonempty student email with a clear validation error', () => {
      const form: RegistrationFormData = {
        student: { student_name: 'Diya Sen', subject: 'English', student_phone: '+91 98765 43210', student_email: 'not-an-email' },
        parent: { parent_name: 'Anita Sen', parent_phone: '+91 98222 11111', parent_email: 'anita@example.com' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '', class_duration: '60' },
        schedules: [],
      };
      const res = validateRegistrationForm(form);
      expect(res.isValid).toBe(false);
      expect(res.errors.student?.student_email).toBe('Invalid student email format.');
    });

    it('persists and restores student phone and email via backend service', () => {
      const created = StudentService.Students_create(spreadsheet, {
        student_name: 'Rohan Gupta',
        parent_name: 'Suresh Gupta',
        parent_phone: '+91 99999 11111',
        student_phone: '+91 88888 22222',
        student_email: 'rohan.gupta@example.com',
        parent_email: 'suresh@example.com',
      }, actor);

      expect(created.success).toBe(true);
      expect(created.data.student_phone).toBe('+91 88888 22222');
      expect(created.data.student_email).toBe('rohan.gupta@example.com');
    });
  });

  describe('2. Multi-Select Subjects', () => {
    it('defines exactly the 6 configured subjects', () => {
      expect(AVAILABLE_SUBJECTS).toEqual([
        'English',
        'Math',
        'Science',
        'Social Science',
        'Hindi',
        'Geeta',
      ]);
    });

    it('parses comma-separated string, array, and legacy subjects cleanly', () => {
      expect(parseSubjectList('English, Hindi')).toEqual(['English', 'Hindi']);
      expect(parseSubjectList(['Math', 'Science'])).toEqual(['Math', 'Science']);
      expect(parseSubjectList('AP Calculus BC')).toEqual(['AP Calculus BC']);
      expect(parseSubjectList('')).toEqual([]);
      expect(parseSubjectList(null)).toEqual([]);
    });

    it('adapts subject list into string representation and preserves structured array', () => {
      const adapted = adaptStudentInput({
        student_name: 'Meera Rao',
        subjects: ['English', 'Hindi', 'Geeta'],
      });
      expect(adapted.subject).toBe('English, Hindi, Geeta');
      expect(adapted.subjects).toEqual(['English', 'Hindi', 'Geeta']);
    });

    it('enriches legacy student records without crashing', () => {
      const legacyStudent = enrichStudentData({
        student_id: 'STU_LEGACY',
        student_name: 'Legacy Learner',
        parent_name: 'Parent',
        parent_phone: '1234567890',
        subject: 'IB Physics HL, AP Chemistry',
        status: 'ACTIVE',
      });
      expect(legacyStudent.subjects).toEqual(['IB Physics HL', 'AP Chemistry']);
      expect(legacyStudent.subject).toBe('IB Physics HL, AP Chemistry');
    });

    it('persists multiple selected subjects in backend and returns them restored', () => {
      const created = StudentService.Students_create(spreadsheet, {
        student_name: 'Kabir Das',
        parent_name: 'Niru Das',
        parent_phone: '+91 98765 43210',
        subjects: ['Hindi', 'Geeta'],
      }, actor);

      expect(created.success).toBe(true);
      expect(created.data.subject).toBe('Hindi, Geeta');
      expect(created.data.subjects).toEqual(['Hindi', 'Geeta']);
    });
  });

  describe('3. Editable Per-Class Rate & Calculation Policy', () => {
    it('calculates default per-class rate automatically from price and purchased count', () => {
      const rate = calculatePerClassRate(25000, 20);
      expect(rate).toBe(1250);
    });

    it('handles zero or invalid class count without division by zero or NaN', () => {
      expect(calculatePerClassRate(25000, 0)).toBe(0);
      expect(calculatePerClassRate('', '')).toBe(0);
      expect(calculatePerClassRate(-500, 10)).toBe(0);
    });

    it('accepts overridden per-class rate in validation and persists to package record', () => {
      const form: RegistrationFormData = {
        student: { student_name: 'Tarun V', subject: 'Math', student_phone: '', student_email: '' },
        parent: { parent_name: 'Ravi V', parent_phone: '+91 98765 00000', parent_email: '' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '25000', per_class: '1400', classes_purchased: '20', class_duration: '60' },
        schedules: [],
        first_class_date: '2026-11-02',
      };
      const val = validateRegistrationForm(form);
      expect(val.isValid).toBe(true);

      const studentRes = StudentService.Students_create(spreadsheet, {
        student_name: 'Tarun V',
        parent_name: 'Ravi V',
        parent_phone: '+91 98765 00000',
      }, actor);

      const pkgRes = PackageService.Packages_create(spreadsheet, {
        student_id: studentRes.data.student_id,
        plan_type: 'Package',
        package_price: 25000,
        per_class: 1400,
        classes_purchased: 20,
      }, actor);

      expect(pkgRes.success).toBe(true);
      expect(pkgRes.data.per_class).toBe(1400);
      expect(pkgRes.data.package_price).toBe(25000);
    });
  });
});
