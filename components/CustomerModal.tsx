/**
 * CustomerPickerModal (CustomerModal)
 * Role: Searchable picker modal used by the Report Generator to browse and select customers.
 * For editing or creating customer records, delegates to CustomerFormModal.
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Building2, Check, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  Skeleton,
} from '@/components/ui';
import CustomerFormModal, { CustomerData } from './CustomerFormModal';

export type { CustomerData };

export interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerData) => void;
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSelectCustomer,
}: CustomerModalProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(25);

  // Unified Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);

  // Confirm delete dialog state
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setSearch('');
      setDisplayLimit(25);
    }
  }, [isOpen]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setDisplayLimit(25);
  };

  const handleFormSubmit = async (formData: CustomerData) => {
    try {
      if (editingCustomer?.id) {
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCustomer.id, ...formData }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update customer');
        }
        toast.success(`Customer "${formData.customerName}" updated`);
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create customer');
        }
        toast.success(`Customer "${formData.customerName}" added`);
      }
      setIsFormOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers?id=${deletingCustomer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete customer');
      }
      toast.success(`Customer "${deletingCustomer.customerName}" deleted`);
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerId.toLowerCase().includes(q) ||
        c.serviceId.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const visibleCustomers = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>

          {/* Search Bar & Add Customer Button */}
          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari nama pelanggan, CID, atau service ID..."
                className="pl-9 h-9"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingCustomer(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Customer
            </Button>
          </div>

          {/* Status & Counter Bar */}
          {!loading && customers.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
              <span>
                {search.trim()
                  ? `Ditemukan ${filtered.length} pelanggan (menampilkan ${visibleCustomers.length} teratas)`
                  : `Menampilkan ${visibleCustomers.length} dari ${customers.length} pelanggan`}
              </span>
              {filtered.length > displayLimit && (
                <span className="text-xs text-slate-500">
                  Ketik nama/ID untuk hasil lebih spesifik
                </span>
              )}
            </div>
          )}

          {/* Customer List */}
          <div className="overflow-y-auto flex-1 mt-2 divide-y divide-slate-100 max-h-[50vh] pr-1">
            {loading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-[13px]">
                  {search ? `No customer found matching "${search}".` : 'No customers registered.'}
                </p>
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleSearchChange('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <>
                {visibleCustomers.map((customer) => (
                  <div
                    key={customer.id || customer.customerId}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        onSelectCustomer(customer);
                        onClose();
                      }}
                      className="flex-1 h-auto p-1 text-left justify-start items-start flex-col hover:bg-transparent font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900 group-hover:text-orange-700 transition-colors">
                          {customer.customerName}
                        </span>
                        <Badge variant="neutral" className="text-xs">
                          {customer.customerId}
                        </Badge>
                        {customer.trafficDirection === 'REVERSED' && (
                          <Badge variant="warning" className="text-xs">
                            Reversed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500 font-sans">
                        <span>SID: <span className="text-slate-700">{customer.serviceId}</span></span>
                        <span>Plan: <span className="text-slate-700">{customer.serviceName}</span></span>
                        <span>Nodes: <span className="tabular-nums text-slate-700">{customer.nodeCount}</span></span>
                        <span>Target SLA: <span className="tabular-nums text-slate-700">{customer.targetSla}%</span></span>
                      </div>
                    </Button>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit customer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(customer);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete customer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCustomer(customer);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filtered.length > displayLimit && (
                  <div className="py-3 text-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setDisplayLimit((prev) => prev + 25)}
                      className="text-xs"
                    >
                      Muat Lebih Banyak (+25 Pelanggan)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Form Modal for Add / Edit */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer}
      />

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        open={Boolean(deletingCustomer)}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title="Delete Customer"
        description={
          deletingCustomer ? (
            <>
              Are you sure you want to delete customer{' '}
              <strong className="text-slate-900">{deletingCustomer.customerName}</strong> ({deletingCustomer.customerId})? This action cannot be undone.
            </>
          ) : null
        }
        confirmText="Delete Customer"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
