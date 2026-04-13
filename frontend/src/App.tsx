import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_BASE = "http://localhost:4000/api";

type Session = {
  token: string;
  role: "USER" | "ADMIN";
  name?: string;
};

type Txn = {
  id: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  createdAt: string;
  senderEmail: string;
  receiverEmail: string;
  description?: string;
  failureReason?: string;
};

type Mode = "home" | "register" | "login-role" | "user-login" | "admin-login";

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

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="shell">
    <header>
      <h1>PulsePay</h1>
      <p>ACID-first digital wallet demo with admin analytics</p>
    </header>
    {children}
  </main>
);

type UserPortalProps = {
  session: Session;
  onLogout: () => void;
};

const UserPortal = ({ session, onLogout }: UserPortalProps) => {
  const [receiverEmail, setReceiverEmail] = useState("receiver@wallet.com");
  const [amount, setAmount] = useState("10");
  const [description, setDescription] = useState("Lunch split");
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

      <h2>User Portal</h2>
      <form className="grid" onSubmit={transfer}>
        <input value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} placeholder="Receiver email" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <button type="submit">Transfer</button>
      </form>

      <h3>Recent Transactions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.senderEmail}</td>
                <td>{tx.receiverEmail}</td>
                <td>{tx.amount}</td>
                <td>{tx.status}</td>
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

  return (
    <section className="panel">
      <div className="summary">
        <span>Welcome, Admin</span>
        <strong>Analytics Dashboard</strong>
        <button type="button" onClick={onLogout}>Logout</button>
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

      <h3>All Transactions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.senderEmail}</td>
                <td>{tx.receiverEmail}</td>
                <td>{tx.amount}</td>
                <td>{tx.status}</td>
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
      const data = await api<{ token: string; user: { name: string } }>("/auth/register", "POST", {
        name,
        email,
        password,
      });
      const next = { token: data.token, role: "USER" as const, name: data.user.name };
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
      const data = await api<{ token: string; user: { name: string } }>("/auth/login", "POST", {
        email,
        password,
      });
      const next = { token: data.token, role: "USER" as const, name: data.user.name };
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
      const next = { token: data.token, role: "ADMIN" as const, name: "Admin" };
      setSession(next);
      setSessionState(next);
      setMode("admin-login");
      setMessage("Logged in as admin.");
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
    return <Shell><UserPortal session={session} onLogout={logout} /></Shell>;
  }

  if (session?.role === "ADMIN") {
    return <Shell><AdminPortal session={session} onLogout={logout} /></Shell>;
  }

  return (
    <Shell>
      {mode === "home" ? (
        <section className="panel">
          <h2>Get started</h2>
          <p className="lede">Choose whether you want to register or log in. If you log in, pick user or admin next.</p>
          <div className="choice-grid">
            <button type="button" onClick={() => setMode("register")}>Register</button>
            <button type="button" onClick={() => setMode("login-role")}>Login</button>
          </div>
          {message && <p className="note">{message}</p>}
        </section>
      ) : (
        renderAuth()
      )}
    </Shell>
  );
};

export default App;
