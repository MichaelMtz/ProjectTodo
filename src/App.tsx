import { useAuth } from "./auth";
import Login from "./components/Login";
import Shell from "./components/Shell";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="boot-screen">Loading…</div>;
  }
  if (!user) {
    return <Login />;
  }
  return <Shell />;
}
