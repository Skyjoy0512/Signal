"use client";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="logout-btn" type="submit" title="ログアウト">
        ログアウト
      </button>
    </form>
  );
}
