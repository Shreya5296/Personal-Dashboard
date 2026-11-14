/**
 * Vitest Global Setup: Mock Google Apps Script LockService by default for unit tests.
 * Individual tests may override or unset globalThis.LockService to test failure branches.
 */

class DefaultMockScriptLock {
  isLocked: boolean = false;
  tryLock(_timeoutMs: number): boolean {
    this.isLocked = true;
    return true;
  }
  releaseLock(): void {
    this.isLocked = false;
  }
}

// @ts-ignore
if (typeof globalThis.LockService === 'undefined') {
  // @ts-ignore
  globalThis.LockService = {
    getScriptLock: () => new DefaultMockScriptLock()
  };
}
