"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("admin@nectarheaven.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg relative overflow-hidden">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-5 right-5 p-2 rounded-md text-text-muted hover:text-text hover:bg-bg-elevated-2 transition-colors"
      >
        {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, var(--gold) 0px, var(--gold) 1px, transparent 1px, transparent 90px)",
        }}
      />
      <div className="relative w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-96 h-24 mb-2">
            <Image src="/logo-transparent.png" alt="Nectar Heaven" fill className="object-contain dark:hidden" priority />
            <Image src="/logo-transparent-white.png" alt="Nectar Heaven" fill className="object-contain hidden dark:block" priority />
          </div>
        </div>

        <div className="bg-bg-elevated border border-border-soft rounded-xl p-7 card-shadow">
          <h2 className="font-display text-lg text-text mb-1">Sign in</h2>
          <p className="text-text-muted text-sm mb-6">StockPro inventory & invoicing</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <p className="text-text-faint text-xs mt-5 text-center">
            Demo credentials are pre-filled — just click Sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
