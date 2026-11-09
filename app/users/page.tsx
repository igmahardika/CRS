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
  Lock,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  Check,
} from 'lucide-react';
import Link from 'next/link';

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

      setFeedback({ type: 'success', message: data.message || 'User created successfully.' });
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
      setFeedback({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setFeedback(null);
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

      setFeedback({ type: 'success', message: data.message || 'User updated successfully.' });
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;
    setActionLoading(true);
    setFeedback(null);
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

      setFeedback({ type: 'success', message: `Password for "${passwordModalUser.name}" updated successfully.` });
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: msg });
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
        setFeedback({
          type: 'success',
          message: `Account "${user.name}" is now ${!user.isActive ? 'Active' : 'Disabled'}.`,
        });
        fetchUsers();
      } else {
        setFeedback({ type: 'error', message: data.error });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: String(err) });
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Permanently delete user "${user.name}" (@${user.username})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'User deleted successfully.' });
        fetchUsers();
      } else {
        setFeedback({ type: 'error', message: data.error });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: String(err) });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" />
            <span>Administrator</span>
          </span>
        );
      case 'OPERATOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Sliders className="w-3 h-3 text-blue-600" />
            <span>Operator</span>
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Eye className="w-3 h-3 text-slate-500" />
            <span>Viewer</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Generator</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-500" />
            <span>User Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure system accounts, credentials, and role-based access permissions.
          </p>
        </div>

        {/* Action Button & Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/15 transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Role Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Total Accounts</div>
            <div className="text-lg font-black text-slate-900">{users.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-purple-700">Administrators</div>
            <div className="text-lg font-black text-purple-900">{adminCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-blue-700">Operators</div>
            <div className="text-lg font-black text-blue-900">{operatorCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-600">Viewers</div>
            <div className="text-lg font-black text-slate-800">{viewerCount}</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xs ${feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'ALL' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All Roles ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'ADMIN' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Admin ({adminCount})
          </button>
          <button
            onClick={() => setRoleFilter('OPERATOR')}
            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'OPERATOR' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Operator ({operatorCount})
          </button>
          <button
            onClick={() => setRoleFilter('VIEWER')}
            className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'VIEWER' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Viewer ({viewerCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Loading user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No Users Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search ? 'No accounts match the specified search query.' : 'No registered accounts available.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Last Sign In</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const initials = user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Username */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {user.email || <span className="text-slate-300 italic">-</span>}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition ${user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          title="Toggle active status"
                        >
                          {user.isActive ? (
                            <>
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 text-rose-600" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td suppressHydrationWarning className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-300 italic">Never signed in</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setPasswordModalUser(user)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4 text-amber-600" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE USER ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Create New User</h3>
                  <p className="text-xs text-slate-500">Add an administrator, operator, or viewer account</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. john.doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Role Permission</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'OPERATOR' })}
                    className={`p-2.5 rounded-xl border text-left transition ${formData.role === 'OPERATOR'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>Operator</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Generator, Master, & Discovery</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`p-2.5 rounded-xl border text-left transition ${formData.role === 'ADMIN'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span>Admin</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Full system management</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'VIEWER' })}
                    className={`p-2.5 rounded-xl border text-left transition ${formData.role === 'VIEWER'
                        ? 'bg-slate-100 border-slate-500 text-slate-900 ring-2 ring-slate-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Viewer</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Read-only history & PDF</p>
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit User Account</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role Permission</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as 'ADMIN' | 'OPERATOR' | 'VIEWER',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="OPERATOR">Operator (Report Generator & Master)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                  <option value="VIEWER">Viewer (Read-Only History)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editIsActive" className="font-bold text-slate-800 cursor-pointer">
                  Account Active
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET PASSWORD ================= */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Reset Password</h3>
              </div>
              <button onClick={() => setPasswordModalUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Reset login password for <strong>{passwordModalUser.name}</strong> (@{passwordModalUser.username}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

