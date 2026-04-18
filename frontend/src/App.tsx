import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_BASE = "http://localhost:5000/api";

type IconName = "wallet" | "shield" | "chart" | "user" | "lock" | "spark";

const shellHighlights: Array<{ title: string; text: string; icon: IconName }> = [
  { title: "ACID Transactions", text: "Transfers execute atomically with consistent balance updates.", icon: "wallet" },
  { title: "Concurrency Control", text: "Serializable operations keep simultaneous transfers reliable.", icon: "shield" },
  { title: "Deadlock Handling", text: "Retriable conflicts are resolved through rollback and retry.", icon: "lock" },
  { title: "Transaction Logging", text: "System events and outcomes are recorded for traceability.", icon: "chart" },
  { title: "XML Data Representation", text: "Structured export supports reporting and integration use cases.", icon: "spark" },
];

const homeStats = [
  { label: "Fast transfers", value: "Instant" },
  { label: "Data integrity", value: "ACID" },
  { label: "Roles", value: "User + Admin" },
  { label: "Security", value: "JWT + Hashing" },
];

const quickSteps = [
  "Create an account or login as seeded user.",
  "Transfer funds using receiver email.",
  "Track transactions live in your dashboard.",
];

const AppIcon = ({ name, className }: { name: IconName; className?: string }) => {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "wallet") {
    return (
      <svg className={className} {...common}>
        <path d="M3 7a2 2 0 0 1 2-2h13a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2z" />
        <path d="M16 12h5" />
        <circle cx="16" cy="12" r="1" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg className={className} {...common}>
        <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg className={className} {...common}>
        <path d="M4 19h16" />
        <path d="M7 15v-4" />
        <path d="M12 15V9" />
        <path d="M17 15V6" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg className={className} {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c1.5-3 4-4.5 7-4.5S17.5 17 19 20" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg className={className} {...common}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      </svg>
    );
  }

  return (
    <svg className={className} {...common}>
      <path d="M12 3v6" />
      <path d="m9.5 10.5 2.5 2.5 2.5-2.5" />
      <path d="M4 16c2-1 4-1.5 8-1.5S18 15 20 16" />
    </svg>
  );
};

type Session = {
  token: string;
  role: "USER" | "ADMIN";
  name?: string;
};

type Txn = {
  id: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "RETRIED";
  retryCount: number;
  createdAt: string;
  senderEmail: string;
  receiverEmail: string;
  description?: string;
  failureReason?: string;
};

type SystemLog = {
  id: string;
  level: "INFO" | "WARN" | "ERROR";
  event: string;
  message: string;
  transactionId?: string | null;
  createdAt: string;
};

type Mode = "home" | "register" | "login-role" | "user-login" | "admin-login" | "forgot-password";

const getStatusClass = (status: Txn["status"]) => {
  if (status === "SUCCESS") return "status-success";
  if (status === "FAILED") return "status-failed";
  return "status-retried";
};

const getSession = (): Session | null => {
  const raw = localStorage.getItem("wallet-session");
  return raw ? (JSON.parse(raw) as Session) : null;
};

const setSession = (session: Session | null) => {
  if (!session) {
    localStorage.removeItem("wallet-session");
    return;
  }
  localStorage.setItem("wallet-session", JSON.stringify(session));
};

const api = async <T,>(path: string, method = "GET", body?: unknown, token?: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: "Request failed" }))) as { message?: string };
    throw new Error(err.message ?? "Request failed");
  }

  return res.json() as Promise<T>;
};

const Shell = ({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) => (
  <main className="shell">
    <div className="ambient ambient-left" aria-hidden="true" />
    <div className="ambient ambient-right" aria-hidden="true" />
    <div className="topbar">
      <div className="topbar-brand">
        <AppIcon name="spark" className="icon-sm" />
        <span>PulsePay App</span>
      </div>
      <div className="topbar-actions">{toolbar}</div>
    </div>
    <header>
      <div className="eyebrow">Digital wallet demo</div>
      <h1>PulsePay</h1>
      <p>ACID-first digital wallet demo with admin analytics</p>
    </header>
    <section className="hero-strip" aria-label="Product highlights">
      {shellHighlights.map((item) => (
        <article key={item.title} className="hero-card">
          <span>
            <AppIcon name={item.icon} className="icon-sm" />
            {item.title}
          </span>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
    {children}
  </main>
);

type UserPortalProps = {
  session: Session;
  onLogout: () => void;
};

const UserPortal = ({ session, onLogout }: UserPortalProps) => {
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [message, setMessage] = useState("");

  const refreshData = async () => {
    const me = await api<{ balance: number }>("/user/me", "GET", undefined, session.token);
    const transactions = await api<Txn[]>("/user/transactions", "GET", undefined, session.token);
    setBalance(me.balance);
    setTxns(transactions);
  };

  useEffect(() => {
    refreshData().catch((error) => setMessage((error as Error).message));
  }, [session.token]);

  const transfer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(
        "/user/transfer",
        "POST",
        {
          receiverEmail,
          amount: Number(amount),
          description,
        },
        session.token,
      );
      setMessage("Transfer successful.");
      setReceiverEmail("");
      setAmount("");
      setDescription("");
      await refreshData();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <section className="panel">
      <div className="summary">
        <span>Welcome, {session.name ?? "User"}</span>
        <strong>Balance: Rs {balance ?? "-"}</strong>
        <button type="button" onClick={onLogout}>Logout</button>
      </div>

      <div className="metric-row" aria-label="User quick facts">
        <article className="metric-card">
          <span>Current balance</span>
          <strong>Rs {balance ?? "-"}</strong>
        </article>
        <article className="metric-card">
          <span>Total records</span>
          <strong>{txns.length}</strong>
        </article>
        <article className="metric-card">
          <span>Last action</span>
          <strong>{txns[0] ? new Date(txns[0].createdAt).toLocaleDateString() : "No transactions"}</strong>
        </article>
      </div>

      <h2>User Portal</h2>
      <form className="grid" onSubmit={transfer}>
        <input value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} placeholder="Receiver email" type="email" required />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" min="0.01" step="0.01" required />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <button type="submit">Transfer</button>
      </form>

      <section className="tips" aria-label="Transfer guide">
        <h3>Transfer checklist</h3>
        <ul>
          <li>Use the exact email used during registration.</li>
          <li>Enter amount greater than 0.</li>
          <li>Check Recent Transactions right after submit.</li>
        </ul>
      </section>

      <h3>Recent Transactions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Retries</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={6}>No transactions yet. Make your first transfer.</td>
              </tr>
            )}
            {txns.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.senderEmail}</td>
                <td>{tx.receiverEmail}</td>
                <td>{tx.amount}</td>
                <td>{tx.retryCount}</td>
                <td><span className={`status-chip ${getStatusClass(tx.status)}`}>{tx.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="note">{message}</p>}
    </section>
  );
};

type AdminPortalProps = {
  session: Session;
  onLogout: () => void;
};

const AdminPortal = ({ session, onLogout }: AdminPortalProps) => {
  const [rows, setRows] = useState<Txn[]>([]);
  const [daily, setDaily] = useState<Array<{ day: string; count: number }>>([]);
  const [statusSplit, setStatusSplit] = useState<Array<{ name: string; value: number }>>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState("");

  const adminToken = useMemo(() => (session.role === "ADMIN" ? session.token : undefined), [session]);

  const loadDashboard = async () => {
    if (!adminToken) return;
    const [list, stats] = await Promise.all([
      api<{ data: Txn[] }>("/admin/transactions?page=1&pageSize=50", "GET", undefined, adminToken),
      api<{ daily: Array<{ day: string; count: number }>; statusSplit: Array<{ name: string; value: number }> }>(
        "/admin/stats",
        "GET",
        undefined,
        adminToken,
      ),
    ]);
    setRows(list.data);
    setDaily(stats.daily);
    setStatusSplit(stats.statusSplit);
  };

  useEffect(() => {
    loadDashboard().catch((error) => setMessage((error as Error).message));
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;

    const loadLogs = async () => {
      const data = await api<SystemLog[]>('/admin/logs', 'GET', undefined, adminToken);
      setLogs(data);
    };

    loadLogs().catch((error) => setMessage((error as Error).message));
    const timer = window.setInterval(() => {
      loadLogs().catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [adminToken]);

  const refreshLogs = async () => {
    if (!adminToken) return;
    const data = await api<SystemLog[]>('/admin/logs', 'GET', undefined, adminToken);
    setLogs(data);
  };

  const simulateTransactions = async () => {
    if (!adminToken) return;
    setSimulating(true);
    try {
      const response = await api<{ message: string; users: string[]; result: { first: string; second: string } }>(
        '/admin/simulate-transactions',
        'POST',
        { amount: 10 },
        adminToken,
      );
      setMessage(`${response.message} (${response.users.join(' vs ')})`);
      await Promise.all([loadDashboard(), refreshLogs()]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSimulating(false);
    }
  };

  const downloadXml = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch(`${API_BASE}/admin/transactions/export/xml`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error("XML export failed");
      const xml = await res.text();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "pulsepay-transactions.xml";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("XML export downloaded.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <section className="panel">
      <div className="summary">
        <span>Welcome, Admin</span>
        <strong>Analytics Dashboard</strong>
        <button type="button" onClick={onLogout}>Logout</button>
      </div>

      <div className="metric-row" aria-label="Admin quick facts">
        <article className="metric-card">
          <span>Total rows</span>
          <strong>{rows.length}</strong>
        </article>
        <article className="metric-card">
          <span>Successful</span>
          <strong>{rows.filter((row) => row.status === "SUCCESS").length}</strong>
        </article>
        <article className="metric-card">
          <span>Failed</span>
          <strong>{rows.filter((row) => row.status === "FAILED").length}</strong>
        </article>
      </div>

      <div className="action-row">
        <button type="button" onClick={simulateTransactions} disabled={simulating}>
          {simulating ? "Simulating..." : "Simulate Transactions"}
        </button>
        <button type="button" className="ghost-btn" onClick={downloadXml}>
          <AppIcon name="spark" className="icon-sm" />
          Export XML
        </button>
      </div>

      <h2>Admin Dashboard</h2>
      <div className="charts">
        <article>
          <h3>Daily Transaction Count</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#f46036" />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article>
          <h3>Status Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusSplit} dataKey="value" nameKey="name" fill="#1b998b" label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </div>

      <section className="logs-panel">
        <div className="logs-header">
          <h3>System Logs</h3>
          <span>Auto-refresh every 3 seconds</span>
        </div>
        <div className="logs-list">
          {logs.length === 0 && <div className="log-empty">No system logs yet.</div>}
          {logs.map((log) => (
            <article key={log.id} className="log-item">
              <div className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</div>
              <div>
                <strong>{log.event}</strong>
                <p>{log.message}</p>
              </div>
              <time>{new Date(log.createdAt).toLocaleTimeString()}</time>
            </article>
          ))}
        </div>
      </section>

      <h3>All Transactions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Retries</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No transactions recorded yet.</td>
              </tr>
            )}
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.senderEmail}</td>
                <td>{tx.receiverEmail}</td>
                <td>{tx.amount}</td>
                <td>{tx.retryCount}</td>
                <td><span className={`status-chip ${getStatusClass(tx.status as Txn["status"])}`}>{tx.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="note">{message}</p>}
    </section>
  );
};

const App = () => {
  const existingSession = getSession();
  const [mode, setMode] = useState<Mode>(() => {
    if (existingSession?.role === "USER") return "user-login";
    if (existingSession?.role === "ADMIN") return "admin-login";
    return "home";
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSessionState] = useState<Session | null>(existingSession);

  useEffect(() => {
    if (session?.role === "USER") {
      setMode("user-login");
    } else if (session?.role === "ADMIN") {
      setMode("admin-login");
    }
  }, [session]);

  const register = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ token: string; user: { name: string; role: "USER" } }>("/auth/register", "POST", {
        name,
        email,
        password,
      });
      const next = { token: data.token, role: data.user.role, name: data.user.name };
      setSession(next);
      setSessionState(next);
      setMode("user-login");
      setMessage("Registered and logged in as user.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const loginUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ token: string; user: { name: string; role: "USER" } }>("/auth/login", "POST", {
        email,
        password,
      });
      console.log("login user response", data);
      const next = { token: data.token, role: data.user.role, name: data.user.name };
      setSession(next);
      setSessionState(next);
      setMode("user-login");
      setMessage("Logged in as user.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const loginAdmin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ token: string }>("/auth/admin/login", "POST", { email, password });
      console.log("login admin response", data);
      const next = { token: data.token, role: "ADMIN" as const, name: "Admin" };
      setSession(next);
      setSessionState(next);
      setMode("admin-login");
      setMessage("Logged in as admin.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const forgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ message: string }>("/auth/reset-password", "POST", {
        email: resetEmail,
        password: newPassword,
      });
      setMessage(data.message);
      setNewPassword("");
      setMode("user-login");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const logout = () => {
    setSession(null);
    setSessionState(null);
    setMode("home");
    setMessage("Logged out.");
  };

  const toolbar = session ? (
    <>
      <button type="button" className="ghost-btn" onClick={() => setMode(session.role === "ADMIN" ? "admin-login" : "user-login")}>
        <AppIcon name={session.role === "ADMIN" ? "chart" : "user"} className="icon-sm" />
        {session.role === "ADMIN" ? "Dashboard" : "Portal"}
      </button>
      <button type="button" className="ghost-btn" onClick={logout}>
        <AppIcon name="lock" className="icon-sm" />
        Logout
      </button>
    </>
  ) : (
    <>
      <button type="button" className="ghost-btn" onClick={() => setMode("register")}>
        <AppIcon name="user" className="icon-sm" />
        Register
      </button>
      <button type="button" className="ghost-btn" onClick={() => setMode("login-role")}>
        <AppIcon name="shield" className="icon-sm" />
        Login
      </button>
    </>
  );

  const renderAuth = () => {
    if (mode === "register") {
      return (
        <section className="panel">
          <div className="summary">
            <strong>Register</strong>
            <button type="button" onClick={() => setMode("home")}>Back</button>
          </div>
          <form className="grid" onSubmit={register}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required minLength={2} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required minLength={6} />
            <button type="submit">Create account</button>
          </form>
          {message && <p className="note">{message}</p>}
        </section>
      );
    }

    if (mode === "login-role") {
      return (
        <section className="panel">
          <div className="summary">
            <strong>Login</strong>
            <button type="button" onClick={() => setMode("home")}>Back</button>
          </div>
          <p className="lede">Choose who you are logging in as.</p>
          <div className="choice-grid">
            <button type="button" onClick={() => setMode("user-login")}>User</button>
            <button type="button" onClick={() => setMode("admin-login")}>Admin</button>
          </div>
        </section>
      );
    }

    if (mode === "user-login") {
      return (
        <section className="panel">
          <div className="summary">
            <strong>User login</strong>
            <button type="button" onClick={() => setMode(session ? "user-login" : "home")}>Back</button>
          </div>
          <form className="grid" onSubmit={loginUser}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required minLength={6} />
            <button type="submit">Login</button>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setMode("forgot-password");
              }}
            >
              Forgot Password?
            </button>
          </form>
          {message && <p className="note">{message}</p>}
        </section>
      );
    }

    if (mode === "forgot-password") {
      return (
        <section className="panel">
          <div className="summary">
            <strong>Forgot password</strong>
            <button type="button" onClick={() => setMode("user-login")}>Back</button>
          </div>
          <form className="grid" onSubmit={forgotPassword}>
            <input
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              type="email"
              placeholder="Your account email"
              required
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="New password"
              required
              minLength={6}
            />
            <button type="submit">Reset password</button>
          </form>
          {message && <p className="note">{message}</p>}
        </section>
      );
    }

    return (
      <section className="panel">
        <div className="summary">
          <strong>Admin login</strong>
          <button type="button" onClick={() => setMode(session ? "admin-login" : "home")}>Back</button>
        </div>
        <form className="grid" onSubmit={loginAdmin}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Admin email" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required minLength={6} />
          <button type="submit">Login as admin</button>
        </form>
        {message && <p className="note">{message}</p>}
      </section>
    );
  };

  if (session?.role === "USER") {
    return <Shell toolbar={toolbar}><UserPortal session={session} onLogout={logout} /></Shell>;
  }

  if (session?.role === "ADMIN") {
    return <Shell toolbar={toolbar}><AdminPortal session={session} onLogout={logout} /></Shell>;
  }

  return (
    <Shell toolbar={toolbar}>
      {mode === "home" ? (
        <div className="home-layout">
          <section className="home-section home-badges" aria-label="Platform badges">
            <div className="badge-row">
              {homeStats.map((item) => (
                <span key={item.label} className="pill">
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </span>
              ))}
            </div>
          </section>

          <section className="panel home-section">
            <h2>Get started</h2>
            <p className="lede">Choose whether you want to register or log in. If you log in, pick user or admin next.</p>
            <div className="choice-grid">
              <button type="button" onClick={() => setMode("register")}>Register</button>
              <button type="button" onClick={() => setMode("login-role")}>Login</button>
            </div>
            {message && <p className="note">{message}</p>}
          </section>

          <section className="panel tips home-section" aria-label="How it works">
            <h3>How it works</h3>
            <ul>
              {quickSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        renderAuth()
      )}
      <footer className="footer-note">PulsePay Demo · Built with React, Express, Prisma</footer>
    </Shell>
  );
};

export default App;
