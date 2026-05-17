import React from 'react';

/**
 * Reusable pagination component.
 * Props: page, pages, onPage(newPage)
 */
export default function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;

  // Build page number array with ellipsis logic
  const getPageNums = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const nums = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
    const sorted = [...nums].sort((a, b) => a - b);
    // Insert null for gaps
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
      result.push(sorted[i]);
    }
    return result;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: '16px 0 6px',
      flexWrap: 'wrap',
    }}>
      {/* Prev */}
      <button
        className="page-btn"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ minWidth: 64 }}
      >
        &larr; Prev
      </button>

      {/* Page numbers */}
      {getPageNums().map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', userSelect: 'none' }}>
            &hellip;
          </span>
        ) : (
          <button
            key={n}
            className={`page-btn${page === n ? ' active' : ''}`}
            onClick={() => onPage(n)}
            style={{ minWidth: 36 }}
          >
            {n}
          </button>
        )
      )}

      {/* Next */}
      <button
        className="page-btn"
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page === pages}
        style={{ minWidth: 64 }}
      >
        Next &rarr;
      </button>

      {/* Info */}
      <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        Page {page} of {pages}
      </span>
    </div>
  );
}
