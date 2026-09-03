import { useState } from 'react';
import type { CatalogCollectionPublic, CatalogTagPublic } from '@/api/catalogApi';
import { CatalogChipDropdown } from './CatalogChipDropdown';
import styles from './Catalog.module.scss';

const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Любая', min: null, max: null },
  { label: 'до 1 000 ₽', min: null, max: 1000 },
  { label: '1–3 тыс.', min: 1000, max: 3000 },
  { label: 'от 3 000 ₽', min: 3000, max: null },
];

function formatRub(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

export function CatalogFilters({
  tags,
  tag,
  collections,
  collection,
  sale,
  priceMin,
  priceMax,
  patchParams,
  onSelectCollection,
}: {
  tags: CatalogTagPublic[];
  tag: string;
  collections: CatalogCollectionPublic[];
  collection: string;
  sale: boolean;
  priceMin: number | null;
  priceMax: number | null;
  patchParams: (patch: Record<string, string | null>) => void;
  /** Сброс path cat/sub + ?collection= */
  onSelectCollection: (slug: string | null) => void;
}) {
  const [openChip, setOpenChip] = useState<string | null>(null);

  let priceChipLabel = 'цена';
  if (priceMin != null && priceMax != null) {
    priceChipLabel = `${formatRub(priceMin)}–${formatRub(priceMax)}`;
  } else if (priceMax != null) {
    priceChipLabel = `до ${formatRub(priceMax)}`;
  } else if (priceMin != null) {
    priceChipLabel = `от ${formatRub(priceMin)}`;
  }

  const priceActive = priceMin != null || priceMax != null;
  const tagActive = Boolean(tag);
  const tagLabel = tag
    ? tags.find((t) => t.slug === tag)?.name ?? 'этапы ухода'
    : 'этапы ухода';

  const collectionActive = Boolean(collection);
  const collectionLabel = collection
    ? collections.find((c) => c.slug === collection)?.name ?? 'коллекции'
    : 'коллекции';

  return (
    <div className={styles.chipsRow}>
      <CatalogChipDropdown
        id="price"
        label={priceChipLabel}
        active={priceActive}
        open={openChip === 'price'}
        onToggle={() => setOpenChip((v) => (v === 'price' ? null : 'price'))}
        onClose={() => setOpenChip(null)}
      >
        {PRICE_PRESETS.map((p) => {
          const selected =
            (priceMin ?? null) === p.min && (priceMax ?? null) === p.max;
          return (
            <button
              key={p.label}
              type="button"
              role="option"
              aria-selected={selected}
              className={styles.chipOption}
              data-active={selected || undefined}
              onClick={() => {
                patchParams({
                  priceMin: p.min != null ? String(p.min) : null,
                  priceMax: p.max != null ? String(p.max) : null,
                  q: null,
                });
                setOpenChip(null);
              }}
            >
              {p.label}
            </button>
          );
        })}
      </CatalogChipDropdown>

      <CatalogChipDropdown
        id="zone"
        label={tagLabel}
        active={tagActive}
        open={openChip === 'zone'}
        onToggle={() => setOpenChip((v) => (v === 'zone' ? null : 'zone'))}
        onClose={() => setOpenChip(null)}
      >
        <button
          type="button"
          role="option"
          aria-selected={!tag}
          className={styles.chipOption}
          data-active={!tag || undefined}
          onClick={() => {
            patchParams({ tag: null, q: null });
            setOpenChip(null);
          }}
        >
          Все
        </button>
        {tags.map((t) => {
          const selected = tag === t.slug;
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={styles.chipOption}
              data-active={selected || undefined}
              onClick={() => {
                patchParams({ tag: selected ? null : t.slug, q: null });
                setOpenChip(null);
              }}
            >
              {t.name}
            </button>
          );
        })}
      </CatalogChipDropdown>

      {collections.length > 0 ? (
        <CatalogChipDropdown
          id="collection"
          label={collectionLabel}
          active={collectionActive}
          open={openChip === 'collection'}
          onToggle={() =>
            setOpenChip((v) => (v === 'collection' ? null : 'collection'))
          }
          onClose={() => setOpenChip(null)}
        >
          <button
            type="button"
            role="option"
            aria-selected={!collection}
            className={styles.chipOption}
            data-active={!collection || undefined}
            onClick={() => {
              onSelectCollection(null);
              setOpenChip(null);
            }}
          >
            Все
          </button>
          {collections.map((c) => {
            const selected = collection === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={styles.chipOption}
                data-active={selected || undefined}
                onClick={() => {
                  onSelectCollection(selected ? null : c.slug);
                  setOpenChip(null);
                }}
              >
                {c.name}
              </button>
            );
          })}
        </CatalogChipDropdown>
      ) : null}

      <button
        type="button"
        className={styles.chip}
        data-active={sale || undefined}
        onClick={() => patchParams({ sale: sale ? null : '1', q: null })}
      >
        со скидкой
      </button>
    </div>
  );
}
