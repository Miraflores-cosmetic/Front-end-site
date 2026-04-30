import { useEffect, useState, useRef } from 'react';
import styles from './DeliveryProfile.module.scss';
import CustomCheckbox from '../custom-checkBox/CustomCheckbox';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { AddressInfo } from '@/types/auth';
import { openAddressDrawer } from '@/store/slices/drawerSlice';
import { setDefaultAddressService } from '@/graphql/queries/adress.service';
import { AddressTypeEnum } from '@/graphql/types/adress.types';
import { useToast } from '@/components/toast/toast';
import { getMe } from '@/store/slices/authSlice';
import { deleteAddress } from '@/graphql/queries/address.service';
import {
  formatProfileShippingAddressLine,
  getDeliveryTypeLabelFromStreet2,
} from '@/utils/deliveryAddressDisplay';

interface DeliveryProfileProps {
  onSelectAddress: (address: AddressInfo) => void;
}

const DeliveryProfile: React.FC<DeliveryProfileProps> = ({ onSelectAddress }) => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isMobile = useScreenMatch();

  useEffect(() => {
    if (me?.addresses && me.addresses.length > 0) {
      setAddresses(me.addresses);

      const defaultAddress =
        me.addresses.find(a => a.isDefaultShippingAddress) ||
        me.addresses.find(a => a.isDefaultBillingAddress) ||
        me.addresses[0];

      if (defaultAddress) {
        setSelectedId(defaultAddress.id);
        onSelectAddress(defaultAddress);
      }
    } else if (me && (!me.addresses || me.addresses.length === 0)) {
      // Если адресов нет, очищаем состояние
      setAddresses([]);
      setSelectedId('');
    }
  }, [me, onSelectAddress]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        if (!menuRefs.current[openMenuId]?.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleAddAddress = () => {
    dispatch(openAddressDrawer());
  };

  // UPDATED FUNCTION
  const handleSelectionChange = async (address: AddressInfo) => {
    if (isUpdating) return; // Prevent double clicks

    // 1. Update UI immediately (Optimistic)
    setSelectedId(address.id);
    onSelectAddress(address);
    setIsUpdating(true);

    try {
      // 2. Call API to make it default on server
      // Since this is "Delivery", we usually set SHIPPING. 
      // If you need Billing, change to AddressTypeEnum.BILLING
      await setDefaultAddressService(address.id, AddressTypeEnum.SHIPPING);
      await dispatch(getMe());
      toast.success('Адрес установлен как адрес по умолчанию');
    } catch (error: any) {
      console.error("Failed to set default address:", error);
      toast.error(error?.message || 'Ошибка при установке адреса по умолчанию');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleEdit = (address: AddressInfo) => {
    dispatch(openAddressDrawer({ address }));
    setOpenMenuId(null);
  };

  const handleDelete = async (addressId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот адрес?')) {
      return;
    }

    try {
      await deleteAddress(addressId);
      await dispatch(getMe());
      toast.success('Адрес успешно удален');
      setOpenMenuId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при удалении адреса');
    }
  };

  const handleMenuToggle = (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === addressId ? null : addressId);
  };

  return (
    <div className={styles.deliveryProfile}>
      <article className={styles.headerWrapper}>
        <h2 className={styles.title}>Адреса доставки</h2>
        {!isMobile && (
          <p className={styles.addAddress} onClick={handleAddAddress}>
            + новый адрес
          </p>
        )}
      </article>

      {addresses.length === 0 ? (
        <p className={styles.emptyText}>Нет сохраненных адресов</p>
      ) : (
        <ul className={styles.list}>
          {addresses.map((address) => {
            const isSelected = selectedId === address.id;

            return (
              <li key={address.id} className={styles.item}>
                <label className={`${styles.label} ${isUpdating ? styles.disabled : ''}`}>
                  <CustomCheckbox
                    checked={isSelected}
                    onChange={() => handleSelectionChange(address)}
                    borderRadius={50}
                  />
                    <div className={styles.info}>
                    <div>
                      <p className={styles.type}>
                        {address.firstName} {address.lastName}
                      </p>
                      <p className={styles.deliveryType}>
                        Тип доставки: {getDeliveryTypeLabelFromStreet2(address.streetAddress2)}
                      </p>
                      <p className={styles.address}>{formatProfileShippingAddressLine(address)}</p>
                    </div>
                  </div>
                </label>
                <div 
                  ref={(el) => {
                    menuRefs.current[address.id] = el;
                  }}
                  className={styles.moreWrapper}
                >
                  <button 
                    className={styles.more} 
                    onClick={(e) => handleMenuToggle(address.id, e)}
                  >
                    ⋯
                  </button>
                  {openMenuId === address.id && (
                    <div className={styles.menu}>
                      <button 
                        className={styles.menuItem}
                        onClick={() => handleEdit(address)}
                      >
                        Изменить
                      </button>
                      <button 
                        className={styles.menuItem}
                        onClick={() => handleDelete(address.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {isMobile && (
        <button onClick={handleAddAddress} className={styles.addBtn}>
          + Новый адрес
        </button>
      )}
    </div>
  );
};

export default DeliveryProfile;