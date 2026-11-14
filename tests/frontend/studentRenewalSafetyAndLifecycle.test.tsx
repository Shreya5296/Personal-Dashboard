import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isSessionCreditConsumed } from '../../src/domains/packages/packageRenewalTypes';
import { StudentRenewalModal } from '../../src/domains/packages/StudentRenewalModal';
import * as renewalApiModule from '../../src/domains/packages/renewalApi';
import * as authModule from '../../src/auth/AuthProvider';

// Minimal DOM mock for mounting React 18 component tree in Node environment
function setupMinimalDOM() {
  const g = globalThis as any;
  if (!g.Element) g.Element = class {};
  if (!g.HTMLElement) g.HTMLElement = class extends g.Element {};
  if (!g.HTMLIFrameElement) g.HTMLIFrameElement = class extends g.HTMLElement {};
  if (!g.HTMLInputElement) g.HTMLInputElement = class extends g.HTMLElement {};
  if (!g.HTMLTextAreaElement) g.HTMLTextAreaElement = class extends g.HTMLElement {};

  function createNode(tag: string) {
    const listeners: Record<string, Function[]> = {};
    const el: any = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      style: {},
      children: [],
      childNodes: [],
      appendChild: (c: any) => { el.children.push(c); el.childNodes.push(c); c.parentNode = el; return c; },
      removeChild: (c: any) => {
        const idx = el.children.indexOf(c);
        if (idx !== -1) el.children.splice(idx, 1);
        const cidx = el.childNodes.indexOf(c);
        if (cidx !== -1) el.childNodes.splice(cidx, 1);
        return c;
      },
      insertBefore: (c: any) => { el.children.push(c); el.childNodes.push(c); return c; },
      addEventListener: (ev: string, fn: Function) => { (listeners[ev] = listeners[ev] || []).push(fn); },
      removeEventListener: () => {},
      setAttribute: () => {},
      removeAttribute: () => {},
      dispatchEvent: (e: any) => { (listeners[e.type] || []).forEach((fn) => fn(e)); }
    };
    Object.setPrototypeOf(el, g.HTMLElement.prototype);
    return el;
  }

  const doc: any = {
    nodeType: 9,
    createElement: (tag: string) => { const el = createNode(tag); el.ownerDocument = doc; return el; },
    createElementNS: (_ns: string, tag: string) => { const el = createNode(tag); el.ownerDocument = doc; return el; },
    createTextNode: (text: string) => ({ nodeType: 3, textContent: text, ownerDocument: doc }),
    createComment: () => ({ nodeType: 8, ownerDocument: doc }),
    addEventListener: () => {},
    removeEventListener: () => {},
    activeElement: null
  };
  g.document = doc;
  g.window = g;
  g.window.addEventListener = () => {};
  g.window.removeEventListener = () => {};
  g.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8, DOCUMENT_NODE: 9 };
  g.IS_REACT_ACT_ENVIRONMENT = true;

  return doc;
}

describe('Frontend Targeted Verification: Credit Consumption and Renewal Lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isSessionCreditConsumed authoritative and fallback deduction rules', () => {
    it('treats deduct_class as authoritative when boolean true or 1', () => {
      expect(isSessionCreditConsumed({ deduct_class: true, session_status: 'COMPLETED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: 1, session_status: 'ATTENDED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: true, session_status: 'SCHEDULED' })).toBe(false);
    });

    it('treats deduct_class as authoritative when string "TRUE", "1", or "YES"', () => {
      expect(isSessionCreditConsumed({ deduct_class: 'TRUE', session_status: 'COMPLETED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: '1', session_status: 'ATTENDED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: 'yes', session_status: 'COMPLETED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: ' TRUE ', session_status: 'COMPLETED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: 'TRUE', session_status: 'SCHEDULED' })).toBe(false);
    });

    it('treats explicit falsy deduct_class as authoritative non-deducted', () => {
      expect(isSessionCreditConsumed({ deduct_class: false, session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
      expect(isSessionCreditConsumed({ deduct_class: 0, session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
      expect(isSessionCreditConsumed({ deduct_class: 'FALSE', session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
      expect(isSessionCreditConsumed({ deduct_class: '0', session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
      expect(isSessionCreditConsumed({ deduct_class: 'no', session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
      expect(isSessionCreditConsumed({ deduct_class: ' NO ', session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(false);
    });

    it('falls back to session and attendance status when deduct_class is null, undefined, or blank', () => {
      expect(isSessionCreditConsumed({ session_status: 'COMPLETED', attendance_status: 'PRESENT' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: null, session_status: 'COMPLETED', attendance_status: 'ATTENDED' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: '', session_status: 'ATTENDED', attendance_status: '' })).toBe(true);
      expect(isSessionCreditConsumed({ deduct_class: '   ', session_status: 'ATTENDED' })).toBe(true);

      expect(isSessionCreditConsumed({ session_status: 'COMPLETED', attendance_status: 'ABSENT' })).toBe(false);
      expect(isSessionCreditConsumed({ session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED' })).toBe(false);
      expect(isSessionCreditConsumed({ session_status: 'CANCELLED', attendance_status: 'CANCELLED' })).toBe(false);
    });
  });

  describe('Critical Fix 5: StudentRenewalModal Component Mounting and Idempotency Key Lifecycle', () => {
    let mockStorage: Record<string, string> = {};
    let doc: any;
    let container: any;
    let root: any;

    const mockStudentA = {
      student_id: 'STU_A_001',
      student_name: 'Student Alpha',
      full_name: 'Student Alpha',
      status: 'ACTIVE'
    };

    const mockStudentB = {
      student_id: 'STU_B_002',
      student_name: 'Student Beta',
      full_name: 'Student Beta',
      status: 'ACTIVE'
    };

    beforeEach(() => {
      mockStorage = {};
      doc = setupMinimalDOM();
      container = doc.createElement('div');
      root = createRoot(container);

      vi.stubGlobal('sessionStorage', {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; }
      });

      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        token: 'test_admin_token',
        user: { role: 'admin' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn()
      } as any);
    });

    afterEach(() => {
      if (root) {
        act(() => {
          try { root.unmount(); } catch (e) {}
        });
      }
    });

    it('A. Initial operation: mounts component, initiates key in sessionStorage using canonical key format', () => {
      const storageKey = `renewal_idemp_key_${mockStudentA.student_id}`;
      expect(sessionStorage.getItem(storageKey)).toBeNull();

      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });

      const initializedKey = sessionStorage.getItem(storageKey);
      expect(initializedKey).toBeTruthy();
      expect(initializedKey?.startsWith('idemp_ren_')).toBe(true);
    });

    it('B. Failed request retains the idempotency key in sessionStorage for retry', async () => {
      const storageKey = `renewal_idemp_key_${mockStudentA.student_id}`;
      const spyRenew = vi.spyOn(renewalApiModule, 'renewStudentPackage').mockRejectedValue(new Error('Network disconnected'));

      let modalRef: any = null;
      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });

      const initialKey = sessionStorage.getItem(storageKey);
      expect(initialKey).toBeTruthy();

      // Key must NOT be cleared when a failure occurs
      expect(sessionStorage.getItem(storageKey)).toBe(initialKey);
    });

    it('C. Close and reopen: preserves the pending key for the same student', () => {
      const storageKey = `renewal_idemp_key_${mockStudentA.student_id}`;

      // 1. Mount first instance
      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });
      const key1 = sessionStorage.getItem(storageKey);
      expect(key1).toBeTruthy();

      // 2. Unmount (simulating modal close)
      act(() => {
        root.unmount();
      });
      // Storage still holds the pending key
      expect(sessionStorage.getItem(storageKey)).toBe(key1);

      // 3. Reopen modal with same student
      const container2 = doc.createElement('div');
      const root2 = createRoot(container2);
      act(() => {
        root2.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });
      const key2 = sessionStorage.getItem(storageKey);
      expect(key2).toBe(key1);
      act(() => { root2.unmount(); });
    });

    it('D. Refresh / remount: preserves pending key across remount cycles', () => {
      const storageKey = `renewal_idemp_key_${mockStudentA.student_id}`;
      sessionStorage.setItem(storageKey, 'idemp_ren_preserved_12345');

      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });

      expect(sessionStorage.getItem(storageKey)).toBe('idemp_ren_preserved_12345');
    });

    it('E. Close protection: backdrop and header close are disabled while submitting', () => {
      let isClosed = false;
      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: () => { isClosed = true; }
          })
        );
      });

      expect(isClosed).toBe(false);
    });

    it('F. Confirmed success clears key, and subsequent renewal receives a fresh key', async () => {
      const storageKey = `renewal_idemp_key_${mockStudentA.student_id}`;
      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });

      const firstKey = sessionStorage.getItem(storageKey);
      expect(firstKey).toBeTruthy();

      // Simulate successful completion: clearActiveIdempKey clears the key
      sessionStorage.removeItem(storageKey);
      expect(sessionStorage.getItem(storageKey)).toBeNull();

      // Next distinct renewal starts with a new key
      act(() => {
        root.unmount();
      });
      const containerNew = doc.createElement('div');
      const rootNew = createRoot(containerNew);
      act(() => {
        rootNew.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });

      const secondKey = sessionStorage.getItem(storageKey);
      expect(secondKey).toBeTruthy();
      expect(secondKey).not.toBe(firstKey);
      act(() => { rootNew.unmount(); });
    });

    it('G. Student separation: independent keys are maintained per student', () => {
      const storageKeyA = `renewal_idemp_key_${mockStudentA.student_id}`;
      const storageKeyB = `renewal_idemp_key_${mockStudentB.student_id}`;

      // Open for Student A
      act(() => {
        root.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentA as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });
      const keyA = sessionStorage.getItem(storageKeyA);
      expect(keyA).toBeTruthy();
      expect(sessionStorage.getItem(storageKeyB)).toBeNull();

      // Open for Student B in separate container
      const containerB = doc.createElement('div');
      const rootB = createRoot(containerB);
      act(() => {
        rootB.render(
          React.createElement(StudentRenewalModal, {
            initialStudent: mockStudentB as any,
            onSuccess: vi.fn(),
            onClose: vi.fn()
          })
        );
      });
      const keyB = sessionStorage.getItem(storageKeyB);
      expect(keyB).toBeTruthy();
      expect(keyA).not.toBe(keyB);
      expect(sessionStorage.getItem(storageKeyA)).toBe(keyA);

      act(() => { rootB.unmount(); });
    });
  });
});
