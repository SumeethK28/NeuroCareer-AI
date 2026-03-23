import { cookies } from "next/headers";

export async function auth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    // Verify token by calling /auth/me
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        Cookie: `auth_token=${token}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const user = await res.json();

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
      backendToken: token,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
