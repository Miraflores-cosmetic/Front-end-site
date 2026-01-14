import React, { useState } from 'react';
import styles from './Delivery.module.scss';
import CustomCheckbox from '../custom-checkBox/CustomCheckbox';

interface Address {
  id: number;
  type: string;
  city: string;
  street: string;
  comment?: string;
}

interface DeliveryProps {
  showTitle?: boolean; // 🔹 возможность скрывать/показывать заголовок
}

const Delivery: React.FC<DeliveryProps> = ({ showTitle = true }) => {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: 1,
      type: 'Пункт СДЭК',
      city: 'г. Суздаль',
      street: 'ул. Ленина, 138/2'
    },
    {
      id: 2,
      type: 'Пункт Почта России',
      city: 'г. Москва',
      street: 'ул. Тверская, 162 к. 5'
    },
    {
      id: 3,
      type: 'Курьером по адресу',
      city: 'г. Суздаль',
      street: 'ул. Тверская, 10 кв. 15',
      comment: 'Осторожно, злая собака!'
    }
  ]);

  const [selectedId, setSelectedId] = useState<number>(1);

  const handleAddAddress = () => {
    const newId = addresses.length + 1;
    const newAddress: Address = {
      id: newId,
      type: `Новый адрес ${newId}`,
      city: 'г. Новый город',
      street: 'ул. Новая, 1'
    };
    setAddresses([...addresses, newAddress]);
    setSelectedId(newId);
  };

  return (
    <div className={styles.delivery}>
      {showTitle && <h2 className={styles.title}>Доставка</h2>} {/* 👈 условный рендер */}
      <ul className={styles.list}>
        {addresses.map(address => (
          <li key={address.id} className={styles.item}>
            <label className={styles.label}>
              <CustomCheckbox
                checked={selectedId === address.id}
                onChange={() => setSelectedId(address.id)}
                borderRadius={50}
              />
              <div className={styles.info}>
                <p className={styles.type}>{address.type}</p>
                <p className={styles.address}>
                  {address.city}, {address.street}
                </p>
                {address.comment && (
                  <p className={styles.comment}>
                    Комментарий : <span>{address.comment}</span>
                  </p>
                )}
              </div>
            </label>
            <button className={styles.more}>⋯</button>
          </li>
        ))}
      </ul>
      <button onClick={handleAddAddress} className={styles.addBtn}>
        + Новый адрес
      </button>
    </div>
  );
};

export default Delivery;
