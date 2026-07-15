export default function Filters({ filters, onFilterChange }) {
  const genderOptions = ['All', 'Male', 'Female', 'Co-Live'];
  const budgetOptions = [
    { value: 'all', label: 'Any Budget' },
    { value: '5000', label: '₹5,000' },
    { value: '6000', label: 'Below ₹6,000' },
    { value: '7000', label: 'Below ₹7,000' },
    { value: '10000-above', label: 'Greater than ₹10,000' },
  ];
  const sortOptions = [
    { value: 'rent-asc', label: 'Price: Low to High' },
    { value: 'rent-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'distance', label: 'Nearest First' },
  ];

  return (
    <div className="filters-section">
      <div className="filters-inner">
        {/* Gender Filter */}
        <div className="filter-group">
          {genderOptions.map(g => (
            <button
              key={g}
              id={`filter-gender-${g.toLowerCase().replace('-', '')}`}
              className={`filter-chip ${filters.gender === g ? 'active' : ''}`}
              onClick={() => onFilterChange({ ...filters, gender: g })}
            >
              {g === 'Male' ? '👨 ' : g === 'Female' ? '👩 ' : g === 'Co-Live' ? '👥 ' : '🏠 '}{g}
            </button>
          ))}
        </div>

        <div className="filter-divider" />

        {/* Budget Filter Chips */}
        <div className="filter-group">
          {budgetOptions.map(b => (
            <button
              key={b.value}
              id={`filter-budget-${b.value}`}
              className={`filter-chip ${filters.maxRent === b.value ? 'active' : ''}`}
              onClick={() => onFilterChange({ ...filters, maxRent: b.value })}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="filter-divider" />

        {/* Sort */}
        <select
          id="filter-sort"
          className="filter-select"
          value={filters.sort}
          onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
        >
          <option value="" disabled>Sort by...</option>
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
