import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/plans', label: 'Mes Plans', icon: 'list_alt' },
  { to: '/plans/new', label: '+', icon: 'add_circle', isAction: true },
  { to: '/profile', label: 'Profil', icon: 'person' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-high border-t border-outline-variant flex items-center justify-around h-16 z-50 px-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors duration-200 active:scale-95 ${tab.isAction
              ? 'bg-primary text-on-primary rounded-full w-12 h-12 flex items-center justify-center shadow-lg'
              : isActive
              ? 'text-primary'
              : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
          {!tab.isAction && <span className="text-label-sm">{tab.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}