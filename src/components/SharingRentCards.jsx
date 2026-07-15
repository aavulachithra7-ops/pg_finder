import { sharingPricing } from '../data/rooms';

export default function SharingRentCards() {
  return (
    <div className="sharing-rent-table-wrapper">
      <table className="sharing-rent-table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Type</th>
            <th>Label</th>
            <th>Price / month</th>
          </tr>
        </thead>
        <tbody>
          {sharingPricing.map(plan => (
            <tr key={plan.type} id={`sharing-${plan.type}`}>
              <td className="sharing-icon-cell">{plan.icon}</td>
              <td className="sharing-type-cell">{plan.type}</td>
              <td className="sharing-label-cell">{plan.label}</td>
              <td className="sharing-price-cell">₹{plan.price.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
