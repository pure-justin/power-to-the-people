import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Qualify from "./pages/Qualify";
import Portal from "./pages/Portal";
import ProjectStatus from "./pages/ProjectStatus";
import Success from "./pages/Success";
import Test3D from "./pages/Test3D";
import SubHubCompare from "./pages/SubHubCompare";
import SmtCallback from "./pages/SmtCallback";
import Admin from "./pages/Admin";
import Referrals from "./pages/Referrals";
import ApiDocs from "./pages/ApiDocs";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/qualify" element={<Qualify />} />
        <Route path="/qualify/smt-callback" element={<SmtCallback />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/project/:id" element={<ProjectStatus />} />
        <Route path="/success" element={<Success />} />
        <Route path="/test3d" element={<Test3D />} />
        <Route path="/compare" element={<SubHubCompare />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
