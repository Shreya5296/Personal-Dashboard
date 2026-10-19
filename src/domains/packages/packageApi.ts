import { sendApiRequest } from '../../api/apiClient';
import { Package, PackageInput, PackageBalanceData } from './packageTypes';

export async function fetchPackages(
  studentId?: string,
  token?: string | null
): Promise<Package[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;

  const response = await sendApiRequest<Package[]>(
    'packages.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function createPackage(
  input: PackageInput,
  token?: string | null
): Promise<Package> {
  const response = await sendApiRequest<Package>(
    'packages.create',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function fetchPackageBalance(
  studentId: string,
  token?: string | null
): Promise<PackageBalanceData> {
  const response = await sendApiRequest<PackageBalanceData>(
    'packages.getBalance',
    { student_id: studentId },
    { token }
  );
  return response.data || {
    totalPurchased: 0,
    totalConsumed: 0,
    totalRestored: 0,
    remainingClasses: 0,
  };
}
