import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <nav>
        
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}