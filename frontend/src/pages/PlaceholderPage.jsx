import { Construction } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function PlaceholderPage({ title, note }) {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <Card>
        <EmptyState icon={Construction} title="Coming in a later phase" text={note} />
      </Card>
    </div>
  );
}