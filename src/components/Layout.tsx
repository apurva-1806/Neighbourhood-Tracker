import React from 'react';
import { 
  Home, 
  BarChart3, 
  Users, 
  Trophy, 
  Settings, 
  LogOut,
  Zap,
  Leaf,
  CloudRain
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { signOut, profile } = useAuth();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'energy', label: 'Energy Logs', icon: BarChart3 },
    { id: 'forecast', label: 'Forecast', icon: CloudRain },
    { id: 'neighborhood', label: 'Neighborhood', icon: Users },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white shadow-lg">
          <div className="flex items-center flex-shrink-0 px-6 pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Energy Tracker</h1>
                <p className="text-sm text-gray-500">Neighborhood Edition</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`
                      w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-green-100 text-green-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon 
                      className={`
                        mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200
                        ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-600'}
                      `} 
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Leaf className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile?.household_size} person household
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`
                  p-3 flex flex-col items-center justify-center space-y-1 transition-colors duration-200
                  ${isActive ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;