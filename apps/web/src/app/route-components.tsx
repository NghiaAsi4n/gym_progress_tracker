import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "react-router-dom";

import { getHealth } from "../services/api-client.js";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          Gym Progress Tracker
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link aria-current="page" to="/">
            Tổng quan
          </Link>
        </nav>
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
      <section aria-labelledby="page-title" className="intro-panel">
        <p className="eyebrow">NỀN TẢNG LUYỆN TẬP CÁ NHÂN</p>
        <h1 id="page-title">Gym Progress Tracker</h1>
        <p className="lede">
          Workspace nền tảng đã sẵn sàng cho các tính năng lịch tập, ghi set và theo dõi tiến bộ.
        </p>
      </section>

      <section aria-labelledby="system-status-title" className="status-panel">
        <div>
          <p className="eyebrow">SYSTEM STATUS</p>
          <h2 id="system-status-title">Kết nối dịch vụ</h2>
        </div>

        {health.isPending ? (
          <p aria-live="polite">Đang kiểm tra API và MongoDB…</p>
        ) : health.isError ? (
          <div role="alert">
            <p>Chưa thể kết nối API hoặc MongoDB.</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void health.refetch()}
            >
              Kiểm tra lại
            </button>
          </div>
        ) : (
          <p className="success-status" role="status">
            <span aria-hidden="true">●</span> API và MongoDB đã sẵn sàng.
          </p>
        )}
      </section>
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
