import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchSearch, clearSearch } from '@/store/slices/searchSlice';
import type { RootState } from '@/store/store';

const DEBOUNCE_MS = 300;

const linkStyle = {
  display: 'block',
  padding: '10px 0',
  borderBottom: '1px solid #eee',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer'
};

export default function Search() {
  const dispatch = useDispatch<any>();
  const [value, setValue] = useState('');
  const { results, loading } = useSelector((s: RootState) => s.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length === 0) {
      dispatch(clearSearch());
      return;
    }
    debounceRef.current = setTimeout(() => {
      dispatch(fetchSearch(value));
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleResultClick = () => {
    setValue('');
    dispatch(clearSearch());
  };

  return (
    <div style={{ padding: 16 }}>
      <input
        value={value}
        onChange={handleChange}
        placeholder="Поиск..."
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #ddd',
          fontSize: 16
        }}
      />

      {loading && <div style={{ marginTop: 12 }}>Поиск…</div>}

      {!loading && value.trim() && results.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>Ничего не найдено</div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {results.map(item => (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.url}
              onClick={handleResultClick}
              style={linkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.type === 'product' && <span style={{ opacity: 0.7, marginRight: 6 }}>Товар: </span>}
              {item.type === 'article' && <span style={{ opacity: 0.7, marginRight: 6 }}>Статья: </span>}
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
