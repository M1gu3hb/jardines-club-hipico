import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

const ADMIN_USER = "admin";
const ADMIN_PASS = "hipico2024";

export default function Admin() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem("jch_admin");
    if (s === "ok") setAuthed(true);
  }, []);

  const handleLogin = (user, pass) => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem("jch_admin", "ok");
      setAuthed(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    sessionStorage.removeItem("jch_admin");
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard onLogout={handleLogout} />;
}