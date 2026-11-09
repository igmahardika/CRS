'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SegmentedControl,
  Badge,
} from '@/components/ui';
import { extractNodeFromServiceId, getSlaByServiceName } from '@/lib/customer-utils';

export interface CustomerData {
  id?: string;
  customerName: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  nodeCount: number;
  targetSla: number;
  graphType?: string;
  graphId?: string;
  cactiGraphId?: string | null;
  prtgSensorId?: string | null;
  trafficDirection?: string;
}

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CustomerData) => Promise<void> | void;
  initialData?: CustomerData | null;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState<CustomerData>({
    customerName: '',
    customerId: '',
    serviceId: '',
    serviceName: 'Prime 300 Mbps',
    nodeCount: 1,
    targetSla: 99.5,
    graphType: 'MRTG',
    graphId: '',
    cactiGraphId: '',
    prtgSensorId: '',
    trafficDirection: 'NORMAL',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        cactiGraphId: initialData.cactiGraphId || '',
        prtgSensorId: initialData.prtgSensorId || '',
        trafficDirection: initialData.trafficDirection || 'NORMAL',
      });
    } else {
      setFormData({
        customerName: '',
        customerId: '',
        serviceId: '',
        serviceName: 'Prime 300 Mbps',
        nodeCount: 1,
        targetSla: 99.5,
        graphType: 'MRTG',
        graphId: '',
        cactiGraphId: '',
        prtgSensorId: '',
        trafficDirection: 'NORMAL',
      });
    }
    setErrorMsg(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!formData.customerId.trim()) {
      setErrorMsg('Customer ID is required.');
      return;
    }
    if (!formData.serviceId.trim()) {
      setErrorMsg('Service ID is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialData?.id);
  const slaMatch = getSlaByServiceName(formData.serviceName);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] font-sans text-red-700">
              {errorMsg}
            </div>
          )}

          <FormField label="Customer Name" required>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. RSJ. Dr. Soeharto Heerdjan"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Customer ID" required>
              <Input
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="e.g. 01.2180.1124"
                className="text-[12px]"
                required
              />
            </FormField>
            <FormField label="Service ID" required>
              <Input
                value={formData.serviceId}
                onChange={(e) => {
                  const newSid = e.target.value;
                  setFormData({
                    ...formData,
                    serviceId: newSid,
                    nodeCount: extractNodeFromServiceId(newSid),
                  });
                }}
                placeholder="e.g. 01.2180.1"
                className="text-[12px]"
                required
              />
            </FormField>
          </div>

          <FormField
            label="Service Plan"
            hint={
              formData.serviceName
                ? slaMatch.hasSla
                  ? `Auto SLA: ${slaMatch.targetSla}% (${slaMatch.label})`
                  : 'No contractual SLA defined'
                : undefined
            }
          >
            <Input
              value={formData.serviceName}
              onChange={(e) => {
                const newServiceName = e.target.value;
                const match = getSlaByServiceName(newServiceName);
                setFormData({
                  ...formData,
                  serviceName: newServiceName,
                  targetSla: match.targetSla,
                });
              }}
              placeholder="e.g. Prime 300 Mbps"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Node Count" hint="Auto-extracted from SID">
              <Input
                type="number"
                min="1"
                value={formData.nodeCount}
                onChange={(e) =>
                  setFormData({ ...formData, nodeCount: parseInt(e.target.value, 10) || 1 })
                }
              />
            </FormField>
            <FormField label="Target SLA (%)">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.targetSla !== undefined ? formData.targetSla : 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setFormData({ ...formData, targetSla: isNaN(val) ? 0 : val });
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cacti Graph ID">
              <Input
                value={formData.cactiGraphId || ''}
                onChange={(e) => setFormData({ ...formData, cactiGraphId: e.target.value })}
                placeholder="e.g. 2180"
                className="text-[12px]"
              />
            </FormField>
            <FormField label="PRTG Sensor ID">
              <Input
                value={formData.prtgSensorId || ''}
                onChange={(e) => setFormData({ ...formData, prtgSensorId: e.target.value })}
                placeholder="e.g. 10542"
                className="text-[12px]"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Preferred Engine">
              <Select
                value={formData.graphType || 'MRTG'}
                onValueChange={(val) => setFormData({ ...formData, graphType: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Engine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MRTG">MRTG (Cacti)</SelectItem>
                  <SelectItem value="PRTG">PRTG Network Monitor</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Traffic Direction">
              <Select
                value={formData.trafficDirection || 'NORMAL'}
                onValueChange={(val) =>
                  setFormData({ ...formData, trafficDirection: val as 'NORMAL' | 'REVERSED' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal (In: DL, Out: UL)</SelectItem>
                  <SelectItem value="REVERSED">Reversed (Out: DL, In: UL)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
