import { FormEvent, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const PIN_CONFIG_KEY = "fvb-admin-pin-config-v1";
const ADMIN_SESSION_KEY = "fvb-admin-unlocked-v1";
const PBKDF2_ITERATIONS = 180000;

type PinConfig = {
  version: 1;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
};

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    256,
  );
  return bytesToBase64(bits);
}

function readPinConfig(): PinConfig | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PIN_CONFIG_KEY) || "");
    if (parsed?.version === 1 && parsed.salt && parsed.hash && parsed.iterations) return parsed;
  } catch {}
  return null;
}

function isAdminSessionUnlocked(pathname: string) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || "");
    return parsed?.unlocked === true && parsed?.scope === "admin" && typeof parsed?.unlockedAt === "string" && pathname.startsWith("/admin");
  } catch {
    return false;
  }
}

function AdminPinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pinConfig, setPinConfig] = useState<PinConfig | null>(() => readPinConfig());
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setupMode = !pinConfig;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (setupMode) {
        if (pin.length < 4) throw new Error("Choose a PIN with at least 4 characters.");
        if (pin !== confirmPin) throw new Error("The PIN entries do not match.");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const nextConfig: PinConfig = {
          version: 1,
          salt: bytesToBase64(salt),
          hash: await derivePinHash(pin, salt),
          iterations: PBKDF2_ITERATIONS,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(PIN_CONFIG_KEY, JSON.stringify(nextConfig));
        setPinConfig(nextConfig);
      } else {
        const hash = await derivePinHash(pin, base64ToBytes(pinConfig.salt), pinConfig.iterations);
        if (hash !== pinConfig.hash) throw new Error("PIN did not match.");
      }

      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ unlocked: true, scope: "admin", unlockedAt: new Date().toISOString() }),
      );
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock admin tools.");
    } finally {
      setBusy(false);
      setPin("");
      setConfirmPin("");
    }
  };

  return (
    <main className="admin-pin-page" aria-label="Admin PIN gate">
      <section className="admin-pin-panel">
        <p className="admin-eyebrow">Admin Tools</p>
        <h1>{setupMode ? "Create Local Admin PIN" : "Enter Admin PIN"}</h1>
        <p>
          This is a browser-local barrier for Tony's admin tools. It is not server authentication, and recovered photos
          stay in this browser until exported.
        </p>
        <form className="admin-pin-form" onSubmit={submit}>
          <label>
            PIN
            <input
              autoFocus
              inputMode="numeric"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoComplete={setupMode ? "new-password" : "current-password"}
            />
          </label>
          {setupMode && (
            <label>
              Confirm PIN
              <input
                inputMode="numeric"
                type="password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                autoComplete="new-password"
              />
            </label>
          )}
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-primary-btn" type="submit" disabled={busy}>
            {busy ? "Checking..." : setupMode ? "Save PIN and Unlock" : "Unlock Admin"}
          </button>
        </form>
        <Link className="admin-muted-link" to="/">
          Back to reader
        </Link>
      </section>
    </main>
  );
}

export function AdminGate() {
  const location = useLocation();
  const [unlocked, setUnlocked] = useState(() => isAdminSessionUnlocked(location.pathname));

  useEffect(() => {
    setUnlocked(isAdminSessionUnlocked(location.pathname));
  }, [location.pathname]);

  const lockAdmin = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setUnlocked(false);
  };

  if (!unlocked) {
    return <AdminPinScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell-header">
        <nav className="admin-shell-nav" aria-label="Admin tools">
          <Link to="/admin">Admin Tools</Link>
          <Link to="/admin/photo-restoration">Photo Restoration</Link>
        </nav>
        <button className="admin-lock-btn" type="button" onClick={lockAdmin}>
          Lock Admin
        </button>
      </header>
      <Outlet />
    </div>
  );
}
