import React from 'react';
import {
  FolderKanban,
  Home,
  Image as ImageIcon,
  Layers,
  Video,
} from 'lucide-react';
import { NavSection } from '../types/studio';

interface MobileBottomNavProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
}

const MOBILE_TABS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'photo-editor', label: 'Photo', icon: ImageIcon },
  { id: 'background-studio', label: 'Backdrop', icon: Layers },
  { id: 'video-editor', label: 'Video', icon: Video },
  { id: 'my-projects', label: 'Projects', icon: FolderKanban },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelect,
}) => {
  return (
    <nav
      aria-label="Android Quick Navigation"
      className="lg:hidden shrink-0 h-[58px] bg-[#111318] border-t border-[#23262E] grid grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)]"
    >
      {MOBILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeSection === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-md transition-colors ${
              active ? 'text-amber-400 font-medium' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-[10px] leading-none whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
