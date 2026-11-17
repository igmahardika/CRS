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

export default function UsersManagementPage() {
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

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load user accounts.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: String(err) });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

  // Role counters
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const supervisorCount = users.filter((u) => u.role === 'SUPERVISOR').length;
  const staffRoleCount = users.filter((u) => u.role === 'STAFF').length;

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
      if (!res.ok) throw new Error(data.error || 'Failed to create user.');

      toast.success(data.message || 'User account created successfully.');
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
      if (!res.ok) throw new Error(data.error || 'Failed to update user.');

      toast.success(data.message || 'Account updated successfully.');
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
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');

      toast.success(`Password for ${passwordModalUser.name} updated successfully.`);
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
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');

      toast.success(`Account "${deletingUser.name}" deleted successfully.`);
      setDeletingUser(null);
      fetchUsers();
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
        title="User Management"
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/staff">
              <Button variant="secondary" size="sm">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                <span>Staff Directory</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add User Account</span>
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Accounts" value={users.length} icon={Users} subtext="Registered users" />
          <StatCard label="Staff" value={staffRoleCount} icon={Sliders} subtext="Generator & creator" />
          <StatCard label="Supervisor" value={supervisorCount} icon={Shield} subtext="Verification & approvals" />
          <StatCard label="Administrator" value={adminCount} icon={Shield} subtext="Full system access" />
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
                placeholder="Search by name, username, or email..."
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
                All ({users.length})
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
                  <TableHead className="w-[180px]">Full Name</TableHead>
                  <TableHead className="w-[120px]">Username</TableHead>
                  <TableHead className="w-[130px]">Department</TableHead>
                  <TableHead className="w-[110px]">Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
                      <p className="text-xs text-slate-500">Loading user accounts...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <EmptyState
                        icon={Users}
                        title="No users found"
                        description="Adjust search keywords or role filters."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-900">{u.name}</TableCell>
                      <TableCell className="font-sans text-xs text-slate-600">@{u.username}</TableCell>
                      <TableCell>{getDeptBadge(u.department)}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.email || '-'}</TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive</Badge>
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
                            title="Delete User"
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

      {/* ================= MODAL: CREATE USER ================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <FormField label="Full Name" required>
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
            <FormField label="Email">
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
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Department" required>
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
              <FormField label="Role" required>
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
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: EDIT USER ================= */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 py-2">
              <FormField label="Full Name" required>
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
                <FormField label="Department" required>
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
                <FormField label="Role" required>
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
                  Active Account
                </label>
              </div>
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button variant="primary" type="submit" loading={actionLoading}>Save Changes</Button>
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
                Reset password for <strong>{passwordModalUser.name}</strong> (@{passwordModalUser.username}).
              </p>
              <FormField label="New Password" required>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setPasswordModalUser(null)}>Cancel</Button>
                <Button variant="primary" type="submit" loading={actionLoading} disabled={!newPassword}>
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Deletion Dialogs */}
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete User Account"
        description={`Permanently delete account "${deletingUser?.name}" (@${deletingUser?.username})? This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="destructive"
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
}
