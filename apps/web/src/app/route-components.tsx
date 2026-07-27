import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "react-router-dom";

import { Button } from "../components/ui/Button.js";
import { Card } from "../components/ui/Card.js";
import { ThemeSwitcher } from "../features/preferences/theme.js";
import { getHealth } from "../services/api-client.js";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-primary">
          <Link className="brand" to="/">
            <span aria-hidden="true" className="brand-mark">
              Ω
            </span>
            <span>Gym Progress Tracker</span>
          </Link>
          <nav aria-label="Điều hướng chính">
            <Link aria-current="page" to="/">
              Tổng quan
            </Link>
          </nav>
        </div>
        <ThemeSwitcher
          groupLabel="Giao diện"
          labels={{ light: "Sáng", dark: "Tối", system: "Hệ thống" }}
        />
      </header>
      <Outlet />
      <footer className="site-footer">
        <small>Foundation build · Phase 1</small>
      </footer>
    </div>
  );
}

export function HomePage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <main className="page">
      <Card aria-labelledby="page-title" className="intro-panel" emphasis>
        <p className="eyebrow">NỀN TẢNG LUYỆN TẬP CÁ NHÂN</p>
        <h1 id="page-title">Gym Progress Tracker</h1>
        <p className="lede">
          Workspace nền tảng đã sẵn sàng cho các tính năng lịch tập, ghi set và theo dõi tiến bộ.
        </p>
      </Card>

      <Card aria-labelledby="system-status-title" className="status-panel">
        <div>
          <p className="eyebrow">SYSTEM STATUS</p>
          <h2 id="system-status-title">Kết nối dịch vụ</h2>
        </div>

        {health.isPending ? (
          <p aria-live="polite">Đang kiểm tra API và MongoDB…</p>
        ) : health.isError ? (
          <div role="alert">
            <p>Chưa thể kết nối API hoặc MongoDB.</p>
            <Button onClick={() => void health.refetch()} variant="secondary">
              Kiểm tra lại
            </Button>
          </div>
        ) : (
          <p className="success-status" role="status">
            <span aria-hidden="true">●</span> API và MongoDB đã sẵn sàng.
          </p>
        )}
      </Card>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="centered-state">
      <p className="eyebrow">404</p>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn bạn mở không tồn tại trong ứng dụng.</p>
      <Link className="button" to="/">
        Về trang chủ
      </Link>
    </main>
  );
}
