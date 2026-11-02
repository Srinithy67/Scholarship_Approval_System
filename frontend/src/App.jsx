import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ApplyPage from './pages/ApplyPage';
import TrackerPage from './pages/TrackerPage';
import CommitteePage from './pages/CommitteePage';
import FinancePage from './pages/FinancePage';
import WorkflowPage from './pages/WorkflowPage';
import VivaDemoPage from './pages/VivaDemoPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="apply" element={<ApplyPage />} />
            <Route path="tracker" element={<TrackerPage />} />
            <Route path="committee" element={<CommitteePage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="workflow" element={<WorkflowPage />} />
            <Route path="viva-demo" element={<VivaDemoPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
