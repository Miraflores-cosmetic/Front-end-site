import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchSearch, clearSearch } from '@/store/slices/searchSlice';
import type { RootState } from '@/store/store';

export default function Search() {
  const dispatch = useDispatch<any>();
  const [value, setValue] = useState('');
  const { results, loading } = useSelector((s: RootState) => s.search);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);

    if (v.trim().length === 0) {
      dispatch(clearSearch());
      return;
    }

    dispatch(fetchSearch(v));
  };

  const handleProductClick = () => {
    // Очищаем поиск при клике на товар
    setValue('');
    dispatch(clearSearch());
  };

  return (
    <div style={{ padding: 16 }}>
      <input
        value={value}
        onChange={handleChange}
        placeholder='Поиск товаров…'
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #ddd',
          fontSize: 16
        }}
      />

      {loading && <div style={{ marginTop: 12 }}>Поиск…</div>}

      {!loading && results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {results.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.slug}`}
              onClick={handleProductClick}
              style={{
                display: 'block',
                padding: '10px 0',
                borderBottom: '1px solid #eee',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
