import { Package } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import RiskSummary from './RiskSummary.jsx';
import { SHIPMENT_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

export default function CurrentShipmentCard({ shipment, risk }) {
  if (!shipment) {
    return (
      <Card title="Current Shipment" icon={Package}>
        <EmptyState title="No shipment assigned" text="Assign this device to a shipment to track limits and risk." />
      </Card>
    );
  }

  const status = SHIPMENT_STATUS[shipment.status] || { label: shipment.status, tone: 'slate' };

  return (
    <Card title="Current Shipment" icon={Package}>
      <div>
        <Row label="Shipment ID">{shipment.shipmentId}</Row>
        <Row label="Product">{shipment.productName}</Row>
        <Row label="Source">{shipment.origin ? shipment.origin.name : '--'}</Row>
        <Row label="Destination">{shipment.destination ? shipment.destination.name : '--'}</Row>
        <Row label="Estimated Arrival">{formatDateTime(shipment.expectedArrival)}</Row>
        <Row label="Status">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </Row>
      </div>
      <RiskSummary risk={risk} />
    </Card>
  );
}