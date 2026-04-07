"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { UserRole, UserStatus } from "@/lib/types";

interface AdminUserRow {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  EVENT_MANAGER: "Event Manager",
  CASHIER: "Kasse",
  VIEWER: "Lesezugriff",
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-800",
  EVENT_MANAGER: "bg-blue-100 text-blue-800",
  CASHIER: "bg-green-100 text-green-800",
  VIEWER: "bg-gray-100 text-gray-700",
};

type ModalMode = "create" | "edit" | "password" | null;

interface FormState {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

const emptyForm: FormState = {
  username: "",
  name: "",
  email: "",
  password: "",
  role: "VIEWER",
  status: "ACTIVE",
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setUsers(await res.json());
    } catch {
      setError("Benutzer konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      loadUsers();
    }
  }, [status, session, loadUsers]);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setSelectedUser(null);
    setModalMode("create");
  }

  function openEdit(user: AdminUserRow) {
    setForm({
      username: user.username,
      name: user.name,
      email: user.email ?? "",
      password: "",
      role: user.role,
      status: user.status,
    });
    setFormError(null);
    setSelectedUser(user);
    setModalMode("edit");
  }

  function openPassword(user: AdminUserRow) {
    setForm({ ...emptyForm, password: "" });
    setFormError(null);
    setSelectedUser(user);
    setModalMode("password");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedUser(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      let res: Response;

      if (modalMode === "create") {
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            name: form.name,
            email: form.email || undefined,
            role: form.role,
          }),
        });
      } else if (modalMode === "edit" && selectedUser) {
        res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email || null,
            role: form.role,
            status: form.status,
          }),
        });
      } else if (modalMode === "password" && selectedUser) {
        res = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: form.password }),
        });
      } else {
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Fehler beim Speichern.");
        return;
      }

      closeModal();
      loadUsers();
    } catch {
      setFormError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: AdminUserRow) {
    const newStatus: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Fehler");
      return;
    }
    loadUsers();
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-8 text-center text-gray-500">Lade Benutzerverwaltung…</div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            Benutzerverwaltung
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Benutzer anlegen, Rollen vergeben, Accounts verwalten
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neuer Benutzer
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name / Benutzername</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">E-Mail</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Rolle</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Erstellt</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Keine Benutzer vorhanden.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{user.name || user.username}</div>
                  <div className="text-xs text-gray-400">@{user.username}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={user.status === "ACTIVE" ? "default" : "secondary"}
                    className={user.status === "ACTIVE" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {user.status === "ACTIVE" ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(user.created_at).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openPassword(user)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                      title="Passwort zurücksetzen"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`p-1.5 rounded hover:bg-gray-100 ${user.status === "ACTIVE" ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}`}
                      title={user.status === "ACTIVE" ? "Deaktivieren" : "Aktivieren"}
                    >
                      {user.status === "ACTIVE" ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role descriptions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <div key={role} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className={`text-xs font-medium mb-1 inline-block px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>
              {label}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {role === "ADMIN" && "Vollzugriff, Benutzer- & Systemverwaltung"}
              {role === "EVENT_MANAGER" && "Events erstellen, Anmeldungen verwalten"}
              {role === "CASHIER" && "Check-In, Zahlungen, Lesezugriff Events"}
              {role === "VIEWER" && "Nur Lesezugriff auf Events & Infos"}
            </p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">
                {modalMode === "create" && "Neuer Benutzer"}
                {modalMode === "edit" && `Benutzer bearbeiten: ${selectedUser?.username}`}
                {modalMode === "password" && `Passwort zurücksetzen: ${selectedUser?.username}`}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {modalMode === "create" && (
                <div className="space-y-1">
                  <Label htmlFor="username">Benutzername *</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="z.B. max.mueller"
                    required
                  />
                </div>
              )}

              {(modalMode === "create" || modalMode === "edit") && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="name">Anzeigename *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="z.B. Max Müller"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">E-Mail (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="max@beispiel.de"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Rolle *</Label>
                    <Select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    >
                      {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, l]) => (
                        <option key={r} value={r}>{l}</option>
                      ))}
                    </Select>
                  </div>
                  {modalMode === "edit" && (
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))}
                      >
                        <option value="ACTIVE">Aktiv</option>
                        <option value="INACTIVE">Inaktiv</option>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {(modalMode === "create" || modalMode === "password") && (
                <div className="space-y-1">
                  <Label htmlFor="password">
                    {modalMode === "create" ? "Passwort *" : "Neues Passwort *"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Mindestens 6 Zeichen"
                    minLength={6}
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Speichere…" : "Speichern"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
