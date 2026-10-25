import { Outlet } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function RequireAdmin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState icon={ShieldOff} title="Administrator access required" text="Your account is a viewer account." />
      </Card>
    );
  }

  return <Outlet />;
}