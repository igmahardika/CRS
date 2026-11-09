'use client';

import React, { useState, useEffect } from 'react';
import { Building2, X } from 'lucide-react';
import { CustomerData } from './CustomerModal';
import { extractNodeFromServiceId } from '@/lib/service-utils';
import { getSlaByServiceName } from '@/lib/service-sla';

interface CustomerFormModalProps {
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
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialData?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500" />
            <span>{isEditing ? 'Edit Customer' : 'Add New Customer'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. RSJ. Dr. Soeharto Heerdjan"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Customer ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="e.g. 01.2180.1124"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Service ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
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
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Service Plan / Bandwidth</label>
              {formData.serviceName && (
                <span
                  className={`text-[10px] font-semibold ${getSlaByServiceName(formData.serviceName).hasSla ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                >
                  {getSlaByServiceName(formData.serviceName).hasSla
                    ? `Auto SLA: ${getSlaByServiceName(formData.serviceName).targetSla}%`
                    : 'No SLA'}
                </span>
              )}
            </div>
            <input
              type="text"
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
              placeholder="e.g. Prime 300 Mbps or Impressive 100Mbps"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Node Count</label>
                <span className="text-[10px] text-orange-600 font-medium">Auto from SID</span>
              </div>
              <input
                type="number"
                min="1"
                value={formData.nodeCount}
                onChange={(e) => setFormData({ ...formData, nodeCount: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Target SLA (%)</label>
                {formData.targetSla === 0 && (
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                    No SLA
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.targetSla !== undefined ? formData.targetSla : 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setFormData({ ...formData, targetSla: isNaN(val) ? 0 : val });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cacti Graph ID (MRTG)</label>
              <input
                type="text"
                value={formData.cactiGraphId || ''}
                onChange={(e) => setFormData({ ...formData, cactiGraphId: e.target.value })}
                placeholder="e.g. 2180"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PRTG Sensor ID (Object ID)</label>
              <input
                type="text"
                value={formData.prtgSensorId || ''}
                onChange={(e) => setFormData({ ...formData, prtgSensorId: e.target.value })}
                placeholder="e.g. 10542"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Preferred Engine</label>
              <select
                value={formData.graphType || 'MRTG'}
                onChange={(e) => setFormData({ ...formData, graphType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="MRTG">MRTG (Cacti) - Default</option>
                <option value="PRTG">PRTG Network Monitor</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Traffic Direction</label>
              <select
                value={formData.trafficDirection || 'NORMAL'}
                onChange={(e) =>
                  setFormData({ ...formData, trafficDirection: e.target.value as 'NORMAL' | 'REVERSED' })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="NORMAL">Normal (In: DL, Out: UL)</option>
                <option value="REVERSED">Reversed (Out: DL, In: UL)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
