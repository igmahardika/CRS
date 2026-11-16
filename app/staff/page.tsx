'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Briefcase,
  Shield,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  Input,
  Badge,
  EmptyState,
  Spinner,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { DEPARTMENTS, Department } from '@/lib/permissions';

export interface StaffData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  roleTitle: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function StaffDirectoryPage() {
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<'ALL' | Department>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Customer Experience' as Department,
    roleTitle: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog State
  const [deletingStaff, setDeletingStaff] = useState<StaffData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff?active=false');
      const data = await res.json();
      if (data.staff && Array.isArray(data.staff)) {
        setStaffList(data.staff);
      }
    } catch {
      toast.error('Failed to load staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.roleTitle && s.roleTitle.toLowerCase().includes(q));

      const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [staffList, search, selectedDept]);

  // Department counts
  const counts = useMemo(() => {
    return {
      all: staffList.length,
      ce: staffList.filter((s) => s.department === 'Customer Experience').length,
      ae: staffList.filter((s) => s.department === 'Account Executive').length,
      finance: staffList.filter((s) => s.department === 'Finance').length,
      noc: staffList.filter((s) => s.department === 'Network Operation').length,
    };
  }, [staffList]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: selectedDept !== 'ALL' ? selectedDept : 'Customer Experience',
      roleTitle: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (staff: StaffData) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      department: staff.department as Department,
      roleTitle: staff.roleTitle || '',
      isActive: staff.isActive,
    });
    setIsModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Staff name is required.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingStaff?.id);
      const url = '/api/staff';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit
        ? { id: editingStaff!.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save staff record.');
        return;
      }

      toast.success(isEdit ? 'Staff member updated successfully.' : 'Staff member created successfully.');
      setIsModalOpen(false);
      fetchStaff();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/staff?id=${deletingStaff.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete staff member.');
        return;
      }

      toast.success(`Staff member "${deletingStaff.name}" has been removed.`);
      setDeletingStaff(null);
      fetchStaff();
    } catch {
      toast.error('An unexpected error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeptBadge = (dept: string) => {
    switch (dept) {
      case 'Customer Experience':
        return <Badge variant="info" className="bg-sky-50 text-sky-700 border-sky-200">Customer Experience</Badge>;
      case 'Account Executive':
        return <Badge variant="neutral" className="bg-purple-50 text-purple-700 border-purple-200">Account Executive</Badge>;
      case 'Finance':
        return <Badge variant="neutral" className="bg-emerald-50 text-emerald-700 border-emerald-200">Finance</Badge>;
      case 'Network Operation':
        return <Badge variant="warning" className="bg-orange-50 text-orange-700 border-orange-200">Network Operation</Badge>;
      default:
        return <Badge variant="neutral">{dept}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Header */}
      <PageHeader
        title="Staff Directory"
        description="Manage departmental points of contact for Customer Experience, Account Executive, Finance, and NOC."
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Staff Member</span>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div
          onClick={() => setSelectedDept('ALL')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedDept === 'ALL'
              ? 'bg-orange-50/80 border-orange-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-slate-500 font-medium">All Staff</div>
          <div className="text-xl font-heading font-bold text-slate-900 mt-1">{counts.all}</div>
        </div>

        <div
          onClick={() => setSelectedDept('Customer Experience')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedDept === 'Customer Experience'
              ? 'bg-sky-50 border-sky-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-sky-700 font-medium">Customer Experience</div>
          <div className="text-xl font-heading font-bold text-sky-950 mt-1">{counts.ce}</div>
        </div>

        <div
          onClick={() => setSelectedDept('Account Executive')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedDept === 'Account Executive'
              ? 'bg-purple-50 border-purple-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-purple-700 font-medium">Account Executive</div>
          <div className="text-xl font-heading font-bold text-purple-950 mt-1">{counts.ae}</div>
        </div>

        <div
          onClick={() => setSelectedDept('Finance')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedDept === 'Finance'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-emerald-700 font-medium">Finance</div>
          <div className="text-xl font-heading font-bold text-emerald-950 mt-1">{counts.finance}</div>
        </div>

        <div
          onClick={() => setSelectedDept('Network Operation')}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            selectedDept === 'Network Operation'
              ? 'bg-orange-50 border-orange-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs text-orange-700 font-medium">Network Operation</div>
          <div className="text-xl font-heading font-bold text-orange-950 mt-1">{counts.noc}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Department Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedDept === 'ALL'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Departments
          </button>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedDept === dept
                  ? 'bg-orange-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            placeholder="Search staff, role, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Spinner size="md" />
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading staff records...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No Staff Records Found"
              description={
                search
                  ? 'No staff member matches your search filter.'
                  : `No staff registered under ${selectedDept === 'ALL' ? 'the directory' : selectedDept}. Click below to add the first member.`
              }
              action={
                <Button variant="secondary" size="sm" onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add Staff Member</span>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role / Position</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Phone / Contact</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff, idx) => (
                  <TableRow key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="text-center text-slate-400 text-xs tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {staff.name.charAt(0)}
                        </div>
                        <span>{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getDeptBadge(staff.department)}</TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {staff.roleTitle || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{staff.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-mono">
                      {staff.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {staff.isActive ? (
                        <Badge variant="success" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-xs text-slate-500">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit staff member"
                          onClick={() => handleOpenEdit(staff)}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete staff member"
                          onClick={() => setDeletingStaff(staff)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <FormField label="Full Name" required>
              <Input
                placeholder="e.g. Budi Santoso"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Department" required>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val as Department })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Role / Position">
              <Input
                placeholder="e.g. Senior Account Executive / CX Specialist"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
              />
            </FormField>

            <FormField label="Email Address" required>
              <Input
                type="email"
                placeholder="e.g. budi@nexa.net.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Phone / WhatsApp Contact">
              <Input
                placeholder="e.g. +628123456789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="staffIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: Boolean(checked) })}
              />
              <label
                htmlFor="staffIsActive"
                className="text-xs font-medium text-slate-700 cursor-pointer select-none"
              >
                Active Member (Available for request selection)
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {editingStaff ? 'Save Changes' : 'Create Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingStaff)}
        onOpenChange={(open) => !open && setDeletingStaff(null)}
        title="Remove Staff Member"
        description={`Are you sure you want to remove "${deletingStaff?.name}" from ${deletingStaff?.department}? This action cannot be undone.`}
        confirmLabel="Remove Member"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </div>
  );
}

