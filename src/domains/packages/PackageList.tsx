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

export interface PackageListProps {
  studentId: string;
  onRenew?: () => void;
}

export const PackageList: React.FC<PackageListProps> = ({ studentId, onRenew }) => {
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

  useEffect(() => { loadData(); }, [studentId, token]);

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
    { key: 'package_name', header: 'Package Name', width: '28%', render: (p) => <span style={{ fontWeight: 600 }}>{p.package_name}</span> },
    { key: 'total_classes', header: 'Total Classes', width: '18%', render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.total_classes} classes</span> },
    { key: 'price', header: 'Package Price', width: '20%', render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatCurrency(p.price)}</span> },
    { key: 'start_date', header: 'Start Date', width: '18%', render: (p) => formatDate(p.start_date) },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      render: (p) => (
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', backgroundColor: p.status === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)', color: p.status === 'ACTIVE' ? 'var(--color-success-text)' : 'var(--color-text-muted)', border: `1px solid ${p.status === 'ACTIVE' ? 'var(--color-success-border)' : 'var(--color-border)'}` }}>
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      {balance && <PackageBalance balance={balance} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Class Packages</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onRenew && (
            <Button variant="primary" size="sm" onClick={onRenew}>
              Renew Package
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : '+ Allocate Package'}
          </Button>
        </div>
      </div>

      {isAdding && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <PackageForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading packages…" />}
      {!loading && packages.length === 0 && <EmptyState title="No packages allocated" description="Create a package to assign classes to this student." />}
      {!loading && packages.length > 0 && <DataTable fixedLayout columns={columns} data={packages} keyExtractor={(p) => p.package_id || `${p.student_id}_${p.start_date}`} />}
    </div>
  );
};
