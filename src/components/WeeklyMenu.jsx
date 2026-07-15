import { weeklyMenu, mealTimings } from '../data/weeklyMenu';

export default function WeeklyMenu() {
  const days = weeklyMenu.map(d => d.day);

  return (
    <div className="weekly-menu horizontal">
      {/* Meal Timings (compact) */}
      <div className="meal-timings-compact">
        {Object.values(mealTimings).map(meal => (
          <div key={meal.label} className="meal-timing-compact">
            <div className="meal-icon">{meal.icon}</div>
            <div className="meal-label">{meal.label}</div>
          </div>
        ))}
      </div>

      {/* Horizontal Menu Table: days across columns */}
      <div className="menu-table-wrapper horizontal">
        <table className="menu-table">
          <thead>
            <tr>
              <th>Meal</th>
              {days.map(d => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(mealTimings).map(mealKey => (
              <tr key={mealKey}>
                <td className="meal-cell">
                  <div className="meal-name">{mealTimings[mealKey].label}</div>
                  <div className="meal-time">{mealTimings[mealKey].time}</div>
                </td>
                {weeklyMenu.map(dayObj => (
                  <td key={dayObj.day} className="meal-item-cell">
                    {dayObj[mealKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="menu-note compact">
        <span>🥗</span>
        <span>Saturday is <strong>vegetarian</strong>. Menu may vary seasonally.</span>
      </div>
    </div>
  );
}
