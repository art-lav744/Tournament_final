import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CreatePage from "./pages/CreatePage.jsx";
import JoinPage from "./pages/JoinPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          Outdoor Together
        </Link>
      </header>

      <main className="page">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </main>
    </div>
  );
}
