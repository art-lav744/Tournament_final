import { Navigate, Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import JoinPage from "./pages/JoinPage.jsx";
import MapPage from "./pages/MapPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/map" replace />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/room/:code" element={<RoomPage />} />
    </Routes>
  );
}
