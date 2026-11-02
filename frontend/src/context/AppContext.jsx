import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

export const ROLES = [
  { id: 'ALL', label: 'All Roles (Superintendent)', badge: 'Admin' },
  { id: 'FA_AA', label: 'FA & AA (Finance & Academics)', badge: 'Reviewer' },
  { id: 'HOD', label: 'Head of Department (HOD)', badge: 'Endorser' },
  { id: 'CHAIRPERSON', label: 'Committee Chairperson', badge: 'Decision Maker' },
  { id: 'VICE_CHANCELLOR', label: 'Vice-Chancellor', badge: 'Executive' },
  { id: 'CHANCELLOR', label: 'Chancellor', badge: 'Executive' },
  { id: 'FINANCE_OFFICER', label: 'Finance & Accounts Officer', badge: 'Disbursement' },
  { id: 'STUDENT', label: 'Student Applicant', badge: 'Public' },
];

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('ALL');
  const [demoMode, setDemoMode] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  const refreshAll = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const data = await api.getHealth();
      setSystemHealth(data);
      setHealthError(null);
    } catch (err) {
      setHealthError(err.message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Poll health and counts periodically
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Update counts on refresh
  useEffect(() => {
    async function loadCounts() {
      try {
        const [tasks, notifs] = await Promise.all([
          api.getTasks({ state: 'CREATED' }),
          api.getNotifications()
        ]);
        setPendingTasksCount(Array.isArray(tasks) ? tasks.length : 0);
        setNotificationsCount(Array.isArray(notifs) ? notifs.length : 0);
      } catch (e) {
        // quiet error
      }
    }
    loadCounts();
  }, [refreshKey]);

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        demoMode,
        setDemoMode,
        systemHealth,
        healthLoading,
        healthError,
        checkHealth,
        refreshKey,
        refreshAll,
        pendingTasksCount,
        notificationsCount,
        roles: ROLES
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
