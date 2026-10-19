import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Package, PackageInput, PackageBalanceData } from './packageTypes';
import { fetchPackages, createPackage, fetchPackageBalance } from './packageApi';
import { PackageBalance } from './PackageBalance';
import { PackageForm } from './PackageForm';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const PackageList: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [balance, setBalance] = useState<PackageBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, bal] = await Promise.all([
        fetchPackages(studentId, token),
        fetchPackageBalance(studentId, token),
      ]);
      setPackages(pkgs);
      setBalance(bal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

  const handleCreate = async (input: PackageInput) => {
    setFormLoading(true);
    try {
      await createPackage(input, token);
      setIsAdding(false);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<Package>[] = [
    { key: 'package_name', header: 'Package Name' },
    { key: 'total_classes', header: 'Total Classes' },
    { key: 'price', header: 'Price', render: (p) => formatCurrency(p.price) },
    { key: 'start_date', header: 'Start Date', render: (p) => formatDate(p.start_date) },
    { key: 'status', header: 'Status', render: (p) => p.status },
  ];

  return (
    <div>
      {balance && <PackageBalance balance={balance} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0 }}>Class Packages</h4>
        <Button variant="secondary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Allocate Package'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <PackageForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading packages…" />}
      {!loading && packages.length === 0 && <EmptyState title="No packages allocated" description="Create a package to assign classes to this student." />}
      {!loading && packages.length > 0 && <DataTable columns={columns} data={packages} keyExtractor={(p) => p.package_id} />}
    </div>
  );
};
