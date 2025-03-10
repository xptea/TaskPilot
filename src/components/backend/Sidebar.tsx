import { useState } from 'react';
import { useAuth } from './AuthContext';

interface SidebarProps {
  onBoardsClick: () => void;
  onTrelloImport?: () => void;
  onSettingsClick: () => void;
  isPinned: boolean;
  onPinChange: (pinned: boolean) => void;
}

const Sidebar = ({ onBoardsClick, onTrelloImport, onSettingsClick, isPinned, onPinChange }: SidebarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { logout } = useAuth();

  const isExpanded = isHovered || isPinned;

  return (
    <div 
      className="fixed left-0 top-0 h-full flex z-50"
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
    >
      <div className="w-2 h-full bg-transparent" />
      
      <div className={`w-12 bg-[#111111] py-3 flex flex-col border-r border-[#222222] items-center transform transition-transform duration-300 ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <h1 className="text-sm font-medium tracking-wide text-[#666666] gap-5 rotate-90 whitespace-nowrap mt-10">
          TASK PILOT
        </h1>
        
        <div className="flex-1 flex flex-col items-center justify-end gap-1.5 mb-2">
          <button 
            onClick={onBoardsClick}
            className="w-10 h-10 flex items-center justify-center group"
          >
            <svg className="w-4 h-4 text-[#999999] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm2 0v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z"/>
            </svg>
          </button>

          <button 
            onClick={onTrelloImport}
            className="w-10 h-10 flex items-center justify-center group"
          >
            <svg className="w-4 h-4 text-[#999999] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>

          <button 
            onClick={onSettingsClick}
            className="w-10 h-10 flex items-center justify-center group"
          >
            <svg className="w-4 h-4 text-[#999999] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>

          <button 
            onClick={logout} 
            className="w-10 h-10 flex items-center justify-center group"
          >
            <svg className="w-4 h-4 text-[#999999] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>

          <button 
            onClick={() => onPinChange(!isPinned)}
            className={`w-10 h-10 flex items-center justify-center group mt-1 transform transition-all duration-300 ${
              isPinned ? 'rotate-180 text-[#666666]' : 'text-[#999999]'
            }`}
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
