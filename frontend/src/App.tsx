import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import KanbanBoard from './components/KanbanBoard';
import ProjectDrawer from './components/ProjectDrawer';
import StatsDrawer from './components/StatsDrawer';
import type { Project } from './types';
import { api } from './api/api';

function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showProjectList, setShowProjectList] = useState(false); // mobile

  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);

  useEffect(() => {
    loadProjects(projectPage);
  }, [projectPage]);

  const loadProjects = async (page: number) => {
    setLoadingProjects(true);
    try {
      const data = await api.listProjects(page, 10);
      setProjects(data.items);
      setProjectTotalPages(data.total_pages);
      if (data.items.length > 0 && !selectedProject) {
        setSelectedProject(data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [...prev, project]);
    setSelectedProject(project);
  };

  const handleProjectUpdated = (updated: Project) => {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setSelectedProject(updated);
    setEditingProject(null);
  };

  const handleProjectDeleted = (projectId: number) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) setSelectedProject(null);
    setEditingProject(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile: hamburger to show project list overlay */}
      <div className="lg:hidden flex items-center">
        <button
          onClick={() => setShowProjectList(true)}
          className="p-3 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay for project list */}
      {showProjectList && (
        <div className="fixed inset-0 z-40 flex">
          <button className="fixed inset-0 bg-black/40 z-40 border-0 cursor-default" onClick={() => setShowProjectList(false)} onKeyDown={e => e.key === 'Escape' && setShowProjectList(false)} aria-label="Close project list" />
          <div className="relative z-50">
            <ProjectList
              projects={projects}
              selectedId={selectedProject?.id ?? null}
              onSelect={p => { setSelectedProject(p); setShowProjectList(false); }}
              onCreated={handleProjectCreated}
              page={projectPage}
              totalPages={projectTotalPages}
              onPageChange={setProjectPage}
            />
          </div>
        </div>
      )}

      {/* Desktop: always visible project list */}
      <div className="hidden lg:flex">
        <ProjectList
          projects={projects}
          selectedId={selectedProject?.id ?? null}
          onSelect={setSelectedProject}
          onCreated={handleProjectCreated}
          page={projectPage}
          totalPages={projectTotalPages}
          onPageChange={setProjectPage}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <span className="text-sm text-gray-500">TaskFlow</span>
          <div className="flex items-center gap-3">
            {selectedProject && (
              <>
                <button
                  onClick={() => setShowStats(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded"
                >
                  View Stats
                </button>
                <button
                  onClick={() => setEditingProject(selectedProject)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded"
                >
                  Project Settings
                </button>
              </>
            )}
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.name}</span>
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        {loadingProjects ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Loading projects...
          </div>
        ) : selectedProject ? (
          <KanbanBoard project={selectedProject} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4 text-center">
            Select or create a project to get started
          </div>
        )}
      </div>

      {editingProject && (
        <ProjectDrawer
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdated={handleProjectUpdated}
          onDeleted={handleProjectDeleted}
        />
      )}

      {showStats && selectedProject && (
        <StatsDrawer
          projectId={selectedProject.id}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}