import React from 'react';
import {
  AudioLines,
  Cpu,
  FolderKanban,
  Home,
  Image as ImageIcon,
  Layers,
  Settings,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { NavSection } from '../types/studio';
import { PWAInstallButton } from './PWAInstallModal';

interface SidebarNavProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  identityLock: boolean;
  installedModelCount: number;
  projectCount: number;
}

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: 'Workspace',
    items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'photo-editor', label: 'AI Photo Editor', icon: ImageIcon },
      { id: 'video-editor', label: 'AI Video Editor', icon: Video },
    ],
  },
  {
    label: 'AI Studios',
    items: [
      { id: 'background-studio', label: 'Background Studio', icon: Layers },
      { id: 'ai-filters', label: 'AI Filters', icon: SlidersHorizontal },
      { id: 'clothing-studio', label: 'Clothing & Style Studio', icon: Shirt },
      { id: 'ai-enhancer', label: 'AI Enhancer', icon: Wand2 },
      { id: 'music-audio', label: 'Music & Audio', icon: AudioLines },
      { id: 'ai-suggestions', label: 'AI Suggestions', icon: Sparkles },
    ],
  },
  {
    label: 'Local Vault',
    items: [
      { id: 'my-projects', label: 'My Projects', icon: FolderKanban },
      { id: 'model-manager', label: 'AI Model Manager', icon: Cpu },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelect,
  mobileOpen,
  onCloseMobile,
  identityLock,
  installedModelCount,
  projectCount,
}) => {
  const renderNavContent = () => (
    <div className="flex h-full flex-col bg-[#111318] border-r border-[#23262E]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262E]">
        <button
          type="button"
          onClick={() => {
            onSelect('home');
            onCloseMobile();
          }}
          className="text-left focus-visible:outline-2 focus-visible:outline-amber-500 rounded-sm"
        >
          <span className="font-display text-base font-semibold tracking-tight text-[#F4F5F7] whitespace-nowrap">
            LumaVault Studio
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Studio Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 pb-1.5 text-xs font-medium text-zinc-500">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const countHint =
                  item.id === 'my-projects' && projectCount > 0
                    ? String(projectCount)
                    : item.id === 'model-manager'
                      ? String(installedModelCount)
                      : null;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        onCloseMobile();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-500 ${
                        isActive
                          ? 'bg-[#1D212A] text-[#F4F5F7] font-medium'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#171A21]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-amber-400' : 'text-zinc-500'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {countHint && (
                        <span className="font-mono-tabular text-xs text-zinc-500 shrink-0">
                          {countHint}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3.5 border-t border-[#23262E] space-y-2.5 text-xs">
        <PWAInstallButton variant="sidebar" />
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck
            className={`w-4 h-4 shrink-0 ${
              identityLock ? 'text-emerald-400' : 'text-amber-400'
            }`}
          />
          <span className="font-medium whitespace-nowrap">
            {identityLock ? 'Identity Lock Active' : 'Identity Lock Paused'}
          </span>
        </div>
        <p className="text-zinc-500 leading-relaxed">
          100% Offline · On-device processing · Zero cloud uploads
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[244px] shrink-0 h-full">{renderNavContent()}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[264px] max-w-[82vw] h-full">{renderNavContent()}</div>
          <button
            type="button"
            aria-label="Dismiss navigation backdrop"
            onClick={onCloseMobile}
            className="flex-1 bg-black/65"
          />
        </div>
      )}
    </>
  );
};
