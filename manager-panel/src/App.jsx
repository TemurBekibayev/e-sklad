import React, { useState, useContext } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Warehouse from './pages/Warehouse';
import DebtLedger from './pages/DebtLedger';
import Employees from './pages/Employees';
import Reports from './pages/Reports';

function AppContent() {
  const { user, t } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBasketId, setSelectedBasketId] = useState(null);

  // If user is not authenticated, show Login screen
  if (!user) {
    return <Login />;
  }

  // Active page routing
  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} setSelectedBasketId={setSelectedBasketId} />;
      case 'sales':
        return <Sales selectedBasketId={selectedBasketId} setSelectedBasketId={setSelectedBasketId} />;
      case 'warehouse':
        return <Warehouse />;
      case 'debts':
        return <DebtLedger />;
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports setActiveTab={setActiveTab} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} setSelectedBasketId={setSelectedBasketId} />;
    }
  };

  // Human readable title for each page
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return t('menuDashboard');
      case 'sales':
        return selectedBasketId ? `${t('menuSales')} — Savat №${selectedBasketId}` : t('menuSales');
      case 'warehouse':
        return t('warehouseTitle');
      case 'debts':
        return t('debtLedgerTitle');
      case 'employees':
        return t('employeesTitle');
      case 'reports':
        return t('reportsTitle');
      default:
        return t('loginTitle');
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} title={getPageTitle()}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
