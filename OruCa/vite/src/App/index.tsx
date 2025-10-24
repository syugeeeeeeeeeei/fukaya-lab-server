import { Box } from "@chakra-ui/react";
import { ProtectedRoute } from "@components/ProtectedRoute";
import { WebSocketProvider } from "@contexts/WebSocketContext";
import LoginPage from '@pages/Admin/LoginPage';
import SettingsPage from '@pages/Admin/SettingsPage';
import MainPage from "@pages/MainPage";
import { LightMode } from "@snippets/color-mode";
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

function App() {
  return (
    <Box bgColor={"white"}>
      <LightMode>
        <WebSocketProvider>
          <Router>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/admin" element={<LoginPage />} />
              <Route
                path="/admin/settings"
                element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
              />
            </Routes>
          </Router>
        </WebSocketProvider>
      </LightMode>
    </Box>
  );
}

export default App;