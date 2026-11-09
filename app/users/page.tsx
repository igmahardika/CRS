'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Sliders,
  Eye,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  X,
  RotateCcw,
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

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'OPERATOR' | 'VIEWER'>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserData | null>(null);

  // Delete user state
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR' as 'ADMIN' | 'OPERATOR' | 'VIEWER',
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Role counters
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const operatorCount = users.filter((u) => u.role === 'OPERATOR').length;
  const viewerCount = users.filter((u) => u.role === 'VIEWER').length;

  // Handlers
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

      toast.success(data.message || 'User created successfully.');
      setIsCreateModalOpen(false);
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'OPERATOR',
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
          isActive: editingUser.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user.');

      toast.success(data.message || 'User updated successfully.');
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
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      toast.success(`Password for "${passwordModalUser.name}" updated successfully.`);
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Account "${user.name}" is now ${!user.isActive ? 'Active' : 'Disabled'}.`);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update user status.');
      }
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `User "${deletingUser.name}" deleted successfully.`);
        setDeletingUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="neutral">Administrator</Badge>;
      case 'OPERATOR':
        return <Badge variant="neutral">Operator</Badge>;
      case 'VIEWER':
      default:
        return <Badge variant="neutral">Viewer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header with single primary button */}
      <PageHeader
        title="User Management"
        description="Configure system accounts, credentials, and role-based access permissions."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            <span>Add User</span>
          </Button>
        }
      />

      {/* Role Stat Cards (Consistent single slate chip style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Accounts" value={users.length} icon={Users} subtext="Registered users" />
        <StatCard label="Administrators" value={adminCount} icon={Shield} subtext="Full permissions" />
        <StatCard label="Operators" value={operatorCount} icon={Sliders} subtext="Report & master access" />
        <StatCard label="Viewers" value={viewerCount} icon={Eye} subtext="Read-only access" />
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
            className="h-6 w-6 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, or email..."
            className="pl-9 pr-9 h-9 text-[13px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-0.5 h-8 w-8 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1 self-start md:self-auto">
          {(search || roleFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setRoleFilter('ALL');
              }}
              className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:bg-orange-50 h-8 px-2.5 font-medium mr-1"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            variant={roleFilter === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setRoleFilter('ALL')}
            className={
              roleFilter === 'ALL'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
            }
          >
            <span>All ({users.length})</span>
          </Button>
          <Button
            variant={roleFilter === 'ADMIN' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setRoleFilter('ADMIN')}
            className={
              roleFilter === 'ADMIN'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
            }
          >
            <span>Admin ({adminCount})</span>
          </Button>
          <Button
            variant={roleFilter === 'OPERATOR' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setRoleFilter('OPERATOR')}
            className={
              roleFilter === 'OPERATOR'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
            }
          >
            <span>Operator ({operatorCount})</span>
          </Button>
          <Button
            variant={roleFilter === 'VIEWER' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setRoleFilter('VIEWER')}
            className={
              roleFilter === 'VIEWER'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
            }
          >
            <span>Viewer ({viewerCount})</span>
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
            <span>Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="No Users Found"
              description={
                search ? 'No accounts match the specified search query.' : 'No registered accounts available.'
              }
              actionLabel={search || roleFilter !== 'ALL' ? 'Reset Filters' : undefined}
              onAction={() => {
                setSearch('');
                setRoleFilter('ALL');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const initials = user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <TableRow key={user.id}>
                      {/* Name & Username */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-semibold flex items-center justify-center text-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-slate-600 font-medium">
                        {user.email || <span className="text-slate-300 font-mono">-</span>}
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell>{getRoleBadge(user.role)}</TableCell>

                      {/* Status Dot */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          className="h-7 px-2 hover:bg-slate-100"
                          title="Toggle active status"
                        >
                          <Badge variant={user.isActive ? 'success' : 'neutral'} dot={true}>
                            {user.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </Button>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell suppressHydrationWarning className="text-slate-500 text-xs">
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPasswordModalUser(user)}
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4 text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingUser(user)}
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingUser(user)}
                            title="Delete User"
                            className="hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE USER ================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <FormField label="Full Name" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Username" required>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. john.doe"
                  className="font-mono text-xs"
                  required
                />
              </FormField>
              <FormField label="Email (Optional)">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </FormField>
            </div>

            <FormField label="Password" required hint="Minimum 6 characters">
              <Input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
              />
            </FormField>

            <FormField label="Role Permission">
              <Select
                value={formData.role}
                onValueChange={(val) =>
                  setFormData({ ...formData, role: val as 'ADMIN' | 'OPERATOR' | 'VIEWER' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">Operator (Report Generator & Master)</SelectItem>
                  <SelectItem value="ADMIN">Administrator (Full Access)</SelectItem>
                  <SelectItem value="VIEWER">Viewer (Read-Only)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={actionLoading}>
                Save User
              </Button>
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

              <FormField label="Role Permission">
                <Select
                  value={editingUser.role}
                  onValueChange={(val) =>
                    setEditingUser({
                      ...editingUser,
                      role: val as 'ADMIN' | 'OPERATOR' | 'VIEWER',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATOR">Operator (Report Generator & Master)</SelectItem>
                    <SelectItem value="ADMIN">Administrator (Full Access)</SelectItem>
                    <SelectItem value="VIEWER">Viewer (Read-Only History)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="editIsActive"
                  checked={editingUser.isActive}
                  onCheckedChange={(c) => setEditingUser({ ...editingUser, isActive: !!c })}
                />
                <label
                  htmlFor="editIsActive"
                  className="text-xs font-sans text-slate-800 cursor-pointer select-none"
                >
                  Account Active
                </label>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={actionLoading}>
                  Save Changes
                </Button>
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
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Reset login password for <strong className="text-slate-900">{passwordModalUser.name}</strong> (@{passwordModalUser.username}).
              </p>

              <FormField label="New Password" required hint="Minimum 6 characters">
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </FormField>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setPasswordModalUser(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={actionLoading} disabled={!newPassword}>
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for User Deletion */}
      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete User Account"
        description={`Permanently delete user account "${deletingUser?.name}" (@${deletingUser?.username})? This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="destructive"
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
}
