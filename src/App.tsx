import React, { useState } from 'react';
import { Activity, Sliders, Layers, Video, Menu, X, Music4 } from 'lucide-react';
import LoopStudio from './features/LoopStudio/LoopStudio';
import AudioEditor from './features/AudioEditor/AudioEditor';
import AudioMixer from './features/AudioMixer/AudioMixer';
import VideoExtractor from './features/VideoExtractor/VideoExtractor';

type View = 'loops' | 'editor' | 'mixer' | 'video';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('loops');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'loops', label: 'Loop Genius', icon: Activity, desc: 'AI Loop Extraction' },
    { id: 'editor', label: 'Audio Editor', icon: Sliders, desc: 'Trim, EQ, Speed' },
    { id: 'mixer', label: 'Studio Mixer', icon: Layers, desc: 'Join & Overlay Tracks' },
    { id: 'video', label: 'Video to Audio', icon: Video, desc: 'Extract MP3 from Video' },
  ];

  return (
    // Changed min-h-screen to h-screen to strictly fill the viewport
    <div className="h-screen bg-slate-950 text-slate-50 font-sans flex overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:relative z-50 h-full w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Music4 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">SonicForge</h1>
              <p className="text-xs text-slate-500">Audio Suite</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as View);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group text-left
                  ${isActive 
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                  }
                `}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs ${isActive ? 'text-emerald-600/70' : 'text-slate-600'}`}>{item.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 shrink-0">
           <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-500 text-center">
                Powered by DSP & FFMPEG
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden h-16 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900 shrink-0">
           <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">
                {navItems.find(n => n.id === activeView)?.label}
              </span>
           </div>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-400">
             <Menu className="w-6 h-6" />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-32 h-full">
             
             {/* Views are now hidden via CSS instead of unmounted, preserving state */}
             <div className={activeView === 'loops' ? 'block h-full' : 'hidden'}>
                <LoopStudio />
             </div>
             
             <div className={activeView === 'editor' ? 'block h-full' : 'hidden'}>
                <AudioEditor />
             </div>
             
             <div className={activeView === 'mixer' ? 'block h-full' : 'hidden'}>
                <AudioMixer />
             </div>
             
             <div className={activeView === 'video' ? 'block h-full' : 'hidden'}>
                <VideoExtractor />
             </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;