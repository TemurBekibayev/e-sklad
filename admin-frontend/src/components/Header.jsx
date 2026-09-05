import React from 'react';

export default function Header({ title }) {
  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>

      {/* Admin Profile */}
      <div className="flex items-center space-x-3.5">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900 leading-tight">Aziz Karimov</div>
          <div className="text-xs text-slate-500 font-medium">Administrator</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-semibold flex items-center justify-center ring-2 ring-blue-100 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
            alt="Aziz Karimov"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerText = 'AK';
            }}
          />
        </div>
      </div>
    </header>
  );
}
