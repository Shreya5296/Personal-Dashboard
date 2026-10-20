/**
 * Deterministic synthetic test namespace generator.
 * Ensures tests are repeatable, isolated, and clearly distinguishable
 * from any real or manual testing records.
 */

export function generateSyntheticTestId(prefix: string = 'E2E'): string {
  const ts = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${ts}_${rand}`.toUpperCase();
}

export function generateSyntheticStudent(id: string) {
  return {
    full_name: `Synthetic Student ${id}`,
    email: `synthetic.${id.toLowerCase()}@example.com`,
    phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    parent_name: `Synthetic Parent ${id}`,
    parent_phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    notes: `Automated E2E QA Record ${id}`,
  };
}
