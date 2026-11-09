'use client';

import React, { useState, useEffect } from 'react';
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
    }
  }, [isOpen]);

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

  const filtered = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.customerId.toLowerCase().includes(search.toLowerCase()) ||
      c.serviceId.toLowerCase().includes(search.toLowerCase())
  );

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
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, Customer ID, or Service ID..."
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

          {/* Customer List */}
          <div className="overflow-y-auto flex-1 mt-4 divide-y divide-slate-100 max-h-[50vh] pr-1">
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
                    onClick={() => setSearch('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              filtered.map((customer) => (
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
                      <span className="text-[13px] font-semibold text-slate-900 group-hover:text-[#C2410C] transition-colors">
                        {customer.customerName}
                      </span>
                      <Badge variant="neutral" className="font-mono text-[11px]">
                        {customer.customerId}
                      </Badge>
                      {customer.trafficDirection === 'REVERSED' && (
                        <Badge variant="warning" className="text-[11px]">
                          Reversed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500 font-sans">
                      <span>SID: <span className="font-mono text-slate-700">{customer.serviceId}</span></span>
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
              ))
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
