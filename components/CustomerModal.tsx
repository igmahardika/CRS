'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Building2, Check, Edit2, Trash2 } from 'lucide-react';
import { extractNodeFromServiceId } from '@/lib/service-utils';
import { getSlaByServiceName } from '@/lib/service-sla';

export interface CustomerData {
  id?: string;
  customerName: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  nodeCount: number;
  targetSla: number;
  graphType?: string; // Default preferred engine: 'MRTG' | 'PRTG'
  graphId?: string;
  cactiGraphId?: string | null;
  prtgSensorId?: string | null;
  trafficDirection?: string;
}

interface CustomerModalProps {
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
      } else {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowAddForm(false);
      setEditingId(null);
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
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = customers.filter(c =>
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    c.customerId.toLowerCase().includes(search.toLowerCase()) ||
    c.serviceId.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 text-base">Select Customer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!showAddForm ? (
            <>
              {/* Search & Add Button */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by customer name, CID, or SID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      customerName: '',
                      customerId: '',
                      serviceId: '',
                      serviceName: 'Prime 300 Mbps',
                      nodeCount: 1,
                      targetSla: 99.5,
                      graphId: '',
                      trafficDirection: 'NORMAL',
                    });
                    setShowAddForm(true);
                  }}
                  className="px-3.5 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              {/* Customer List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading customers...</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-700">No matching customers found.</div>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="text-xs text-orange-600 hover:text-orange-700 underline font-medium"
                    >
                      Clear search &quot;{search}&quot;
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{c.customerName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {c.serviceName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 items-center">
                          <span>CID: <strong className="text-slate-700">{c.customerId}</strong></span>
                          <span>SID: <strong className="text-slate-700">{c.serviceId}</strong></span>
                          <span>Target SLA: <strong className={c.targetSla > 0 ? "text-emerald-700" : "text-slate-500"}>{c.targetSla > 0 ? `${c.targetSla}%` : 'No SLA'}</strong></span>
                          {(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId)) && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">
                              <strong>Cacti:</strong> {c.cactiGraphId || c.graphId}
                            </span>
                          )}
                          {(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId)) && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              <strong>PRTG:</strong> {c.prtgSensorId || c.graphId}
                            </span>
                          )}
                          <span>Dir: <strong className="text-slate-700">{c.trafficDirection || 'NORMAL'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(c.id || null);
                            setFormData(c);
                            setShowAddForm(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id!, c.customerName)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onSelectCustomer(c);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Select</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-sm text-slate-800">
                  {editingId ? 'Edit Customer' : 'Add New Customer'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: RSJ. Dr. Soeharto Heerdjan"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Contoh: 01.1496.0624"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Service ID *</label>
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
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Contoh: 01.2180.1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Service Name / Bandwidth</label>
                    {formData.serviceName && (
                      <span className="text-[10px] font-semibold text-emerald-600">
                        {getSlaByServiceName(formData.serviceName).hasSla
                          ? `Auto SLA: ${getSlaByServiceName(formData.serviceName).targetSla}%`
                          : 'Tanpa SLA'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.serviceName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = getSlaByServiceName(val);
                      setFormData({
                        ...formData,
                        serviceName: val,
                        targetSla: match.targetSla,
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Contoh: Prime 300 Mbps atau Impressive 100Mbps"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Node Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.nodeCount}
                    onChange={(e) => setFormData({ ...formData, nodeCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Target SLA (%)</label>
                    {formData.targetSla === 0 && (
                      <span className="text-[10px] text-slate-500 font-medium">Tanpa SLA</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetSla !== undefined ? formData.targetSla : 0}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, targetSla: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cacti Graph ID (MRTG)</label>
                  <input
                    type="text"
                    value={formData.cactiGraphId || ''}
                    onChange={(e) => setFormData({ ...formData, cactiGraphId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Contoh: 2180"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PRTG Sensor ID (Object ID)</label>
                  <input
                    type="text"
                    value={formData.prtgSensorId || ''}
                    onChange={(e) => setFormData({ ...formData, prtgSensorId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Contoh: 10542"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Preferred Engine</label>
                  <select
                    value={formData.graphType || 'MRTG'}
                    onChange={(e) => setFormData({ ...formData, graphType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="MRTG">MRTG (Cacti) - Default</option>
                    <option value="PRTG">PRTG Network Monitor</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Traffic Direction</label>
                  <select
                    value={formData.trafficDirection || 'NORMAL'}
                    onChange={(e) => setFormData({ ...formData, trafficDirection: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="NORMAL">Normal (In: DL, Out: UL)</option>
                    <option value="REVERSED">Reversed (Out: DL, In: UL)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
