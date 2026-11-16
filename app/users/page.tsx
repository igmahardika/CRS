'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Sliders,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  X,
  RotateCcw,
  UserCheck,
  Briefcase,
  Phone,
  Mail,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
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
  Checkbox,
  ConfirmDialog,
  Badge,
  PageHeader,
  StatCard,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
} from '@/components/ui';
import { DEPARTMENTS, Department, USER_ROLES, UserRole } from '@/lib/permissions';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'OPERATOR' | 'VIEWER';
  department: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface StaffData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  roleTitle: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function UsersManagementPage() {
  const [activeSection, setActiveSection] = useState<'users' | 'staff'>('users');

  // ================= USERS STATE =================
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<'ALL' | Department>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'VIEWER' | 'OPERATOR'>('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'OPERATOR' | 'VIEWER',
    department: 'Network Operation' as Department,
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ================= STAFF PIC STATE =================
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState<'ALL' | Department>('ALL');

  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffData | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffData | null>(null);

  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Account Executive' as Department,
    roleTitle: 'Account Manager',
    isActive: true,
  });

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal memuat akun pengguna.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: String(err) });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Staff
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/staff?active=false');
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaffList(data.staff);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStaff();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;
      return matchesSearch && matchesRole && matchesDept;
    });
  }, [users, search, roleFilter, deptFilter]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = staffSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.roleTitle && s.roleTitle.toLowerCase().includes(q)) ||
        s.department.toLowerCase().includes(q);

      const matchesDept = staffDeptFilter === 'ALL' || s.department === staffDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staffList, staffSearch, staffDeptFilter]);

  // Role counters
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const supervisorCount = users.filter((u) => u.role === 'SUPERVISOR').length;
  const staffRoleCount = users.filter((u) => u.role === 'STAFF').length;

  // Staff counters
  const salesStaffCount = staffList.filter((s) => s.department === 'Account Executive').length;
  const ceStaffCount = staffList.filter((s) => s.department === 'Customer Experience').length;
  const finStaffCount = staffList.filter((s) => s.department === 'Finance').length;

  // Handlers for Users
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat user.');

      toast.success(data.message || 'Akun pengguna berhasil dibuat.');
      setIsCreateModalOpen(false);
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
        department: 'Network Operation',
        isActive: true,
      });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          department: editingUser.department,
          isActive: editingUser.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui user.');

      toast.success(data.message || 'Akun berhasil diperbarui.');
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passwordModalUser.id,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal reset password.');

      toast.success(`Password untuk ${passwordModalUser.name} berhasil diperbarui.`);
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus user.');

      toast.success(`Akun "${deletingUser.name}" berhasil dihapus.`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  // Handlers for Staff PIC
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah staf.');

      toast.success(data.message || 'Staf berhasil ditambahkan.');
      setIsCreateStaffModalOpen(false);
      setStaffFormData({
        name: '',
        email: '',
        phone: '',
        department: 'Account Executive',
        roleTitle: 'Account Manager',
        isActive: true,
      });
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStaff),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui staf.');

      toast.success(data.message || 'Data staf berhasil diperbarui.');
      setEditingStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!deletingStaff) return;
    try {
      const res = await fetch(`/api/staff?id=${deletingStaff.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus staf.');

      toast.success('Data staf berhasil dihapus.');
      setDeletingStaff(null);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="neutral">Administrator</Badge>;
      case 'SUPERVISOR':
        return <Badge variant="info">Supervisor</Badge>;
      case 'STAFF':
        return <Badge variant="warning">Staff</Badge>;
      case 'OPERATOR':
        return <Badge variant="soft">Operator</Badge>;
      case 'VIEWER':
      default:
        return <Badge variant="neutral">Viewer</Badge>;
    }
  };

  const getDeptBadge = (dept: string) => {
    switch (dept) {
      case 'Network Operation':
        return <Badge variant="success">NOC</Badge>;
      case 'Customer Experience':
        return <Badge variant="info">CX / CE</Badge>;
      case 'Account Executive':
        return <Badge variant="warning">Sales / AE</Badge>;
      case 'Finance':
        return <Badge variant="neutral">Finance</Badge>;
      default:
        return <Badge variant="neutral">{dept || 'NOC'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pengguna &amp; Direktori Staf"
        description="Kelola akun login pengguna sistem serta master staf PIC komersial (Sales &amp; Customer Experience)."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Generator</span>
          </Link>
        }
        actions={
          activeSection === 'users' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Tambah User Login</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateStaffModalOpen(true)}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>Tambah Staf / PIC</span>
            </Button>
          )
        }
      />

      {/* Main Section Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveSection('users')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSection === 'users'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Akun Login Sistem ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('staff')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSection === 'staff'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Direktori Staf / PIC Sales &amp; CE ({staffList.length})</span>
        </button>
      </div>

      {/* ================= SECTION 1: USERS ================= */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Akun" value={users.length} icon={Users} subtext="Pengguna terdaftar" />
            <StatCard label="Staff" value={staffRoleCount} icon={Sliders} subtext="Generator &amp; pembuat" />
            <StatCard label="Supervisor" value={supervisorCount} icon={Shield} subtext="Verifikasi &amp; approval" />
            <StatCard label="Administrator" value={adminCount} icon={Shield} subtext="Akses penuh sistem" />
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-lg border text-xs flex items-center justify-between shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-semibold">{feedback.message}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setFeedback(null)}
                className="h-6 w-6 text-slate-500 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Search & Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama user, username, atau email..."
                className="pl-9 pr-9 h-9 text-[13px]"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-0.5 h-8 w-8 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 self-start md:self-auto">
              <Button
                variant={roleFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleFilter('ALL')}
                className={roleFilter === 'ALL' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Semua ({users.length})
              </Button>
              <Button
                variant={roleFilter === 'STAFF' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleFilter('STAFF')}
                className={roleFilter === 'STAFF' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Staff ({staffRoleCount})
              </Button>
              <Button
                variant={roleFilter === 'SUPERVISOR' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleFilter('SUPERVISOR')}
                className={roleFilter === 'SUPERVISOR' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Supervisor ({supervisorCount})
              </Button>
              <Button
                variant={roleFilter === 'ADMIN' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleFilter('ADMIN')}
                className={roleFilter === 'ADMIN' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Admin ({adminCount})
              </Button>
            </div>
          </div>

          {/* Table Users */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Nama Lengkap</TableHead>
                  <TableHead className="w-[120px]">Username</TableHead>
                  <TableHead className="w-[130px]">Departemen</TableHead>
                  <TableHead className="w-[110px]">Jabatan</TableHead>
                  <TableHead>Email Akun</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
                      <p className="text-xs text-slate-500">Memuat data pengguna...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <EmptyState
                        icon={Users}
                        title="Tidak ada pengguna ditemukan"
                        description="Sesuaikan kata kunci pencarian atau filter peranan."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-900">{u.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">@{u.username}</TableCell>
                      <TableCell>{getDeptBadge(u.department)}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.email || '-'}</TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="neutral">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPasswordModalUser(u)}
                            title="Reset Password"
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingUser(u)}
                            title="Edit User"
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingUser(u)}
                            title="Hapus User"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ================= SECTION 2: STAFF PIC ================= */}
      {activeSection === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Staf PIC" value={staffList.length} icon={UserCheck} subtext="PIC komersial &amp; internal" />
            <StatCard label="Account Executive" value={salesStaffCount} icon={Briefcase} subtext="PIC Sales / Bisnis" />
            <StatCard label="Customer Experience" value={ceStaffCount} icon={Users} subtext="PIC Layanan Pelanggan" />
            <StatCard label="Finance" value={finStaffCount} icon={Shield} subtext="PIC Penagihan / AR" />
          </div>

          {/* Search & Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <Input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Cari nama staf PIC, email, atau jabatan..."
                className="pl-9 pr-9 h-9 text-[13px]"
              />
              {staffSearch && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStaffSearch('')}
                  className="absolute right-1 top-0.5 h-8 w-8 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 self-start md:self-auto">
              <Button
                variant={staffDeptFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStaffDeptFilter('ALL')}
                className={staffDeptFilter === 'ALL' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Semua Dept ({staffList.length})
              </Button>
              <Button
                variant={staffDeptFilter === 'Account Executive' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStaffDeptFilter('Account Executive')}
                className={staffDeptFilter === 'Account Executive' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Sales / AE ({salesStaffCount})
              </Button>
              <Button
                variant={staffDeptFilter === 'Customer Experience' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStaffDeptFilter('Customer Experience')}
                className={staffDeptFilter === 'Customer Experience' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                CE / CX ({ceStaffCount})
              </Button>
              <Button
                variant={staffDeptFilter === 'Finance' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStaffDeptFilter('Finance')}
                className={staffDeptFilter === 'Finance' ? 'bg-slate-900 text-white hover:bg-slate-800 h-8 px-2.5 text-xs font-semibold' : 'text-slate-600 h-8 px-2.5 text-xs'}
              >
                Finance ({finStaffCount})
              </Button>
            </div>
          </div>

          {/* Table Staff */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Nama Lengkap PIC</TableHead>
                  <TableHead className="w-[140px]">Departemen</TableHead>
                  <TableHead className="w-[150px]">Jabatan / Peran</TableHead>
                  <TableHead>Email Resmi</TableHead>
                  <TableHead className="w-[130px]">No. Telepon / WA</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="text-right w-[90px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStaff ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
                      <p className="text-xs text-slate-500">Memuat data staf PIC...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <EmptyState
                        icon={UserCheck}
                        title="Belum ada staf PIC"
                        description="Tambahkan data staf Sales dan CE agar otomatis muncul pada form permintaan laporan."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                      <TableCell>{getDeptBadge(s.department)}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">{s.roleTitle || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">{s.email}</TableCell>
                      <TableCell className="text-xs text-slate-600">{s.phone || '-'}</TableCell>
                      <TableCell>
                        {s.isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="neutral">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingStaff(s)}
                            title="Edit Data Staf"
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingStaff(s)}
                            title="Hapus Staf"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE USER ================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Akun Pengguna Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <FormField label="Nama Lengkap" required>
              <Input
                placeholder="e.g. Budi Santoso"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Username" required>
              <Input
                placeholder="e.g. budi.santoso"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Email Akun">
              <Input
                type="email"
                placeholder="e.g. budi@nexa.net.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
            <FormField label="Password" required>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Departemen" required>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val as Department })}
                >
                  <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Peran (Role)" required>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val as UserRole })}
                >
                  <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Simpan Akun</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: EDIT USER ================= */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Akun Pengguna</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
              <FormField label="Nama Lengkap" required>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Departemen" required>
                  <Select
                    value={editingUser.department || 'Network Operation'}
                    onValueChange={(val) => setEditingUser({ ...editingUser, department: val })}
                  >
                    <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Peran" required>
                  <Select
                    value={editingUser.role}
                    onValueChange={(val) => setEditingUser({ ...editingUser, role: val as UserRole })}
                  >
                    <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="editIsActive"
                  checked={editingUser.isActive}
                  onCheckedChange={(c) => setEditingUser({ ...editingUser, isActive: !!c })}
                />
                <label htmlFor="editIsActive" className="text-xs text-slate-800 cursor-pointer">
                  Akun Aktif
                </label>
              </div>
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditingUser(null)}>Batal</Button>
                <Button variant="primary" type="submit" loading={actionLoading}>Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: RESET PASSWORD ================= */}
      <Dialog open={Boolean(passwordModalUser)} onOpenChange={(open) => !open && setPasswordModalUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {passwordModalUser && (
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              <p className="text-xs text-slate-600">
                Reset password untuk <strong>{passwordModalUser.name}</strong> (@{passwordModalUser.username}).
              </p>
              <FormField label="Password Baru" required>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setPasswordModalUser(null)}>Batal</Button>
                <Button variant="primary" type="submit" loading={actionLoading} disabled={!newPassword}>
                  Perbarui Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: CREATE STAFF ================= */}
      <Dialog open={isCreateStaffModalOpen} onOpenChange={setIsCreateStaffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Staf PIC Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-4 py-2">
            <FormField label="Nama Lengkap Staf" required>
              <Input
                placeholder="e.g. Dimas Prasetya"
                value={staffFormData.name}
                onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Alamat Email Resmi" required>
              <Input
                type="email"
                placeholder="e.g. dimas@nexa.net.id"
                value={staffFormData.email}
                onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Departemen" required>
                <Select
                  value={staffFormData.department}
                  onValueChange={(val) => setStaffFormData({ ...staffFormData, department: val as Department })}
                >
                  <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Jabatan / Peran">
                <Input
                  placeholder="e.g. Account Manager"
                  value={staffFormData.roleTitle}
                  onChange={(e) => setStaffFormData({ ...staffFormData, roleTitle: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Nomor Telepon / WhatsApp (Opsional)">
              <Input
                placeholder="e.g. 081234567890"
                value={staffFormData.phone}
                onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
              />
            </FormField>
            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCreateStaffModalOpen(false)}>Batal</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Simpan Staf PIC</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: EDIT STAFF ================= */}
      <Dialog open={Boolean(editingStaff)} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Staf PIC</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <form onSubmit={handleUpdateStaff} className="space-y-4 py-2">
              <FormField label="Nama Lengkap Staf" required>
                <Input
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Alamat Email Resmi" required>
                <Input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Departemen" required>
                  <Select
                    value={editingStaff.department}
                    onValueChange={(val) => setEditingStaff({ ...editingStaff, department: val })}
                  >
                    <SelectTrigger selectSize="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Jabatan / Peran">
                  <Input
                    value={editingStaff.roleTitle || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, roleTitle: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Nomor Telepon / WA">
                <Input
                  value={editingStaff.phone || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                />
              </FormField>
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="editStaffIsActive"
                  checked={editingStaff.isActive}
                  onCheckedChange={(c) => setEditingStaff({ ...editingStaff, isActive: !!c })}
                />
                <label htmlFor="editStaffIsActive" className="text-xs text-slate-800 cursor-pointer">
                  Staf Aktif
                </label>
              </div>
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditingStaff(null)}>Batal</Button>
                <Button variant="primary" type="submit" loading={actionLoading}>Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Deletion Dialogs */}
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Hapus Akun Pengguna"
        description={`Hapus permanen akun "${deletingUser?.name}" (@${deletingUser?.username})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Akun"
        variant="destructive"
        onConfirm={handleConfirmDeleteUser}
      />

      <ConfirmDialog
        open={Boolean(deletingStaff)}
        onOpenChange={(open) => !open && setDeletingStaff(null)}
        title="Hapus Staf PIC"
        description={`Hapus permanen data staf "${deletingStaff?.name}" (${deletingStaff?.department})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Staf"
        variant="destructive"
        onConfirm={handleConfirmDeleteStaff}
      />
    </div>
  );
}
