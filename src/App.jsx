import React, { useState } from 'react';
import AnalyzeView from './views/AnalyzeView';
import EquipmentLibraryView from './views/EquipmentLibraryView';
// Import the provider for the Equipment Library
import { EquipmentLibraryProvider } from './views/EquipmentLibraryContext'; // Assuming co-location
import { AnalysisProvider } from './views/AnalysisContext'; // Co-located with view

const TABS = {
  ANALYZE: 'Analyze',
  EQUIPMENT_LIBRARY: 'Equipment Library',
  // Add more tabs here in the future
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.ANALYZE);

  const renderActiveTabView = () => {
    switch (activeTab) {
      case TABS.ANALYZE:
        return <AnalyzeView />;
      case TABS.EQUIPMENT_LIBRARY:
        return <EquipmentLibraryView />;
      default:
        return <AnalyzeView />; // Default to Analyze tab
    }
  };

  return (
    // Wrap the entire application in the providers. The state will now persist
    // across tab switches because the providers never unmount.
    <AnalysisProvider>
      <EquipmentLibraryProvider>
        <div className="flex flex-col h-screen bg-gray-100">
          <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
            <h1 className="text-2xl font-bold">Diagram Interpreter - DiagramIQ</h1>
            <nav>
              {Object.values(TABS).map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
                    ${activeTab === tabName
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    } mr-2 last:mr-0`}
                >
                  {tabName}
                </button>
              ))}
            </nav>
          </header>
          <main className="flex-grow overflow-auto">{renderActiveTabView()}</main>
        </div>
      </EquipmentLibraryProvider>
    </AnalysisProvider>
  );
}

export default App;
