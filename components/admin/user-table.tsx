'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, X, Check } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: 'active' | 'pending';
}

export function UserTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteStatus('idle');
    setInviteMessage('');

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to send invite');
      }

      setInviteStatus('success');
      setInviteMessage(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      // Refresh user list
      fetchUsers();
    } catch (err) {
      setInviteStatus('error');
      setInviteMessage(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </h2>
        <Button size="sm" onClick={() => setShowInviteForm((v) => !v)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Employee
        </Button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <p className="text-sm font-medium">Invite a new employee</p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              disabled={inviting}
              required
            />
            <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInviteForm(false);
                setInviteEmail('');
                setInviteStatus('idle');
                setInviteMessage('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
          {inviteStatus === 'success' && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              {inviteMessage}
            </p>
          )}
          {inviteStatus === 'error' && <p className="text-sm text-destructive">{inviteMessage}</p>}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No users found.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-4 py-3 font-medium">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
                      {user.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
