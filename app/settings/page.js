"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent, Label, Input } from "@/components/ui";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input defaultValue="84 Liquor Land" readOnly />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input defaultValue="+6010-000 8400" readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input defaultValue="84LiquorLand@gmail.com" readOnly />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input defaultValue="21 Jalan Fauna 12, 63000 Cyberjaya, Selangor, Malaysia" readOnly />
            </div>
            <p className="text-xs text-text-faint">Editable business settings are coming in a future update.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input defaultValue={user?.name || ""} readOnly />
            </div>
            <div>
              <Label>Email</Label>
              <Input defaultValue={user?.email || ""} readOnly />
            </div>
            <div>
              <Label>Role</Label>
              <Input defaultValue={user?.role || ""} readOnly className="capitalize" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
