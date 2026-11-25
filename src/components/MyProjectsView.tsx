import React, { useState } from 'react';
import {
  Copy,
  FolderOpen,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { LocalProject } from '../types/studio';

interface MyProjectsViewProps {
  projects: LocalProject[];
  currentPhotoName: string;
  onSaveCurrentProject: (name: string, type: 'photo' | 'video') => void;
  onOpenProject: (project: LocalProject) => void;
  onDuplicateProject: (project: LocalProject) => void;
  onDeleteProject: (id: string) => void;
}

export const MyProjectsView: React.FC<MyProjectsViewProps> = ({
  projects,
  currentPhotoName,
  onSaveCurrentProject,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [newProjectName, setNewProjectName] = useState(`${currentPhotoName} Edit`);
  const [saveType, setSaveType] = useState<'photo' | 'video'>('photo');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchType = filterType === 'all' || p.type === filterType;
    const matchSearch = p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchType && matchSearch;
  });

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a project name before saving locally.');
      return;
    }
    setErrorMsg(null);
    onSaveCurrentProject(trimmed, saveType);
    setNewProjectName('');
  };

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-7">
      <div className="max-w-[1180px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#23262E]">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100">
              My Local Projects
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Stored privately in local device storage (IndexedDB) · Non-destructive layers &amp; edit states
            </p>
          </div>
          <span className="font-mono-tabular text-xs text-zinc-400">
            {projects.length} saved project{projects.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Save Active Workspace Form */}
        <form
          onSubmit={handleSaveSubmit}
          className="p-5 rounded-lg border border-[#23262E] bg-[#12141A] space-y-3"
        >
          <p className="text-sm font-medium text-zinc-100">Save Current Session Locally</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              aria-label="Project name"
              placeholder="e.g. Executive Headshot 4K"
              className="flex-1 rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <select
              aria-label="Project media type"
              value={saveType}
              onChange={(e) => setSaveType(e.target.value as 'photo' | 'video')}
              className="rounded-md bg-[#181B22] border border-[#2A2E39] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="photo">Photo Session</option>
              <option value="video">Video Session</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#0B0C0E] text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Save to Local Vault</span>
            </button>
          </div>
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        </form>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search local projects..."
              aria-label="Search local projects"
              className="w-full rounded-md bg-[#12141A] border border-[#23262E] pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-md bg-[#12141A] border border-[#23262E]">
            {(['all', 'photo', 'video'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  filterType === t
                    ? 'bg-[#222631] text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {filtered.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-[#2A2E39] bg-[#111318] text-center space-y-2">
            <FolderOpen className="w-7 h-7 text-zinc-500 mx-auto" />
            <p className="text-sm font-medium text-zinc-200">
              {projects.length === 0
                ? 'Your local project vault is empty'
                : 'No projects match your filter'}
            </p>
            <p className="text-xs text-zinc-400">
              Save your current editing session above to store non-destructive layers locally on this device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border border-[#23262E] bg-[#12141A] overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => onOpenProject(project)}
                  className="aspect-[16/10] bg-[#090A0D] overflow-hidden relative text-left"
                >
                  {project.thumbnailDataUrl ? (
                    <img
                      src={project.thumbnailDataUrl}
                      alt={project.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      Local {project.type} project
                    </div>
                  )}
                </button>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono-tabular">
                      {project.type === 'photo' ? 'Photo' : 'Video'} · {project.resolution} ·{' '}
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {project.identityLocked ? 'Identity Lock Saved' : 'Standard Edit'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1D2028]">
                    <button
                      type="button"
                      onClick={() => onOpenProject(project)}
                      className="px-3 py-1.5 rounded-md bg-[#1D212A] hover:bg-amber-500 hover:text-[#0B0C0E] text-xs font-medium text-zinc-100 transition-colors"
                    >
                      Open Project
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Duplicate ${project.name}`}
                        onClick={() => onDuplicateProject(project)}
                        className="p-1.5 rounded hover:bg-[#1E222D] text-zinc-400 hover:text-zinc-100"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => onDeleteProject(project.id)}
                        className="p-1.5 rounded hover:bg-red-500/15 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
