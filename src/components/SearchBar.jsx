import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getSearchSuggestions } from '../data/pgData';

export default function SearchBar({ searchQuery, onSearch, onSubmit, listings = [] }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Rebuild suggestions whenever the query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    const results = getSearchSuggestions(searchQuery, listings);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setActiveIndex(-1);
  }, [searchQuery, listings]);

  // Recompute dropdown position whenever it should show
  useEffect(() => {
    if (showSuggestions && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  }, [showSuggestions, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Also reposition on scroll/resize
  useEffect(() => {
    if (!showSuggestions) return;
    const update = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 99999,
        });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [showSuggestions]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        setShowSuggestions(false);
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const selectSuggestion = (value) => {
    onSearch(value);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setTimeout(() => onSubmit(), 0);
  };

  const handleClear = () => {
    onSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const dropdown = showSuggestions ? createPortal(
    <div
      style={{
        ...dropdownStyle,
        background: 'rgba(13, 13, 23, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
        animation: 'sgFadeIn 0.15s ease',
      }}
    >
      {/* Keyframes injected once */}
      <style>{`
        @keyframes sgFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '8px 14px 6px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(139,92,246,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        Suggestions
      </div>

      {suggestions.map((s, i) => {
        const isActive = i === activeIndex;
        const isPGName = listings.some(pg => pg.name === s);
        return (
          <div
            key={s}
            onMouseDown={() => selectSuggestion(s)}
            onMouseEnter={() => setActiveIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              cursor: 'pointer',
              background: isActive ? 'rgba(139,92,246,0.13)' : 'transparent',
              borderLeft: isActive ? '3px solid rgba(139,92,246,0.9)' : '3px solid transparent',
              transition: 'all 0.1s ease',
            }}
          >
            {/* Icon chip */}
            <span style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: isActive ? 'rgba(139,92,246,0.28)' : 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              transition: 'background 0.1s',
            }}>
              {isPGName ? '🏠' : '📍'}
            </span>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.82)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {highlightMatch(s, searchQuery)}
              </div>
            </div>

            {/* Badge */}
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: isPGName ? 'rgba(139,92,246,0.18)' : 'rgba(16,185,129,0.15)',
              color: isPGName ? 'rgba(167,139,250,0.95)' : 'rgba(52,211,153,0.95)',
              border: isPGName ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(16,185,129,0.25)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {isPGName ? 'PG' : 'Area'}
            </span>
          </div>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <div className="search-container">
        <div className="search-input-group" style={{ position: 'relative', flex: 1 }}>
          <span className="search-icon">📍</span>
          <input
            ref={inputRef}
            id="search-input"
            className="search-input"
            type="text"
            placeholder="Search by PG name, location, area..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="search-btn"
          id="search-btn"
          onClick={() => { setShowSuggestions(false); onSubmit(); }}
        >
          🔍 Search PGs
        </button>
      </div>

      {dropdown}
    </div>
  );
}

/** Bold-highlight the matching portion of a suggestion */
function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#a78bfa', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
