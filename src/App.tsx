import { useState } from "react";
import "./main.css";
import BoardView from "./components/pages/Board";
import BoardsList from "./components/pages/BoardLIST";
import Sidebar from "./components/backend/Sidebar";
import SignIn from "./components/pages/Auth";
import TrelloImportView from './components/backend/TrelloImport';
import SettingsView from './components/pages/Settings';
import { AuthProvider, useAuth } from "./components/backend/AuthContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'boards' | 'board' | 'import' | 'settings'>('boards');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);

  if (!user) {
    return <SignIn />;
  }

  const handleBoardSelect = (boardId: string) => {
    setSelectedBoardId(boardId);
    setCurrentView('board');
  };

  const handleTrelloImport = () => {
    setCurrentView('import');
  };

  const handleBackToBoards = () => {
    setCurrentView('boards');
    setSelectedBoardId(null);
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  return (
    <div className="flex h-screen bg-[#111111]">
      <Sidebar 
        onBoardsClick={handleBackToBoards}
        onTrelloImport={handleTrelloImport}
        onSettingsClick={handleSettingsClick}
        isPinned={isSidebarPinned}
        onPinChange={setIsSidebarPinned}
      />
      
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarPinned ? 'ml-16' : ''}`}>
        {currentView === 'boards' && (
          <BoardsList onSelectBoard={handleBoardSelect} />
        )}
        {currentView === 'board' && selectedBoardId && (
          <BoardView 
            boardId={selectedBoardId} 
            onTrelloImport={handleTrelloImport}
          />
        )}
        {currentView === 'import' && (
          <TrelloImportView onBack={handleBackToBoards} onSettings={function (): void {
            throw new Error("Function not implemented.");
          } } />
        )}
        {currentView === 'settings' && (
          <SettingsView onBack={handleBackToBoards} />
        )}
      </main>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
