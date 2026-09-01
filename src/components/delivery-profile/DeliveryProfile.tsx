import { useEffect, useState, useRef } from 'react';
import styles from './DeliveryProfile.module.scss';
import CustomCheckbox from '../custom-checkBox/CustomCheckbox';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { AddressInfo } from '@/types/auth';
import { openAddressDrawer } from '@/store/slices/drawerSlice';
import { setDefaultAddressService } from '@/graphql/queries/address.service';
import { AddressTypeEnum } from '@/graphql/types/address.types';
import { useToast } from '@/components/toast/toast';
import { getMe } from '@/store/slices/authSlice';
import { deleteAddress } from '@/graphql/queries/address.service';
import {
  formatProfileShippingAddressLine,
  getDeliveryTypeLabelFromStreet2,
} from '@/utils/deliveryAddressDisplay';
import {
  isCheckoutReadyAddress,
  needsDeliveryPointReselection,
} from '@/utils/checkoutShipping';
import {
  clearGuestShippingAddress,
  loadGuestShippingAddress,
  subscribeGuestShippingAddress,
} from '@/utils/guestShippingAddress';
import { useOrderCheckoutOptional } from '@/pages/Order/OrderCheckoutContext';
interface DeliveryProfileProps {
  onSelectAddress: (address: AddressInfo) => void;
  /** Подсветка блока, если адрес не выбран / невалиден при submit. */
  hasError?: boolean;
  errorMessage?: string;
}

const DeliveryProfile: React.FC<DeliveryProfileProps> = ({
  onSelectAddress,
  hasError = false,
  errorMessage,
}) => {
  const { me, isAuth } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const orderCheckout = useOrderCheckoutOptional();
  const clearSelectedAddress = orderCheckout?.clearSelectedAddress;
  const [addresses, setAddresses] = useState<AddressInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [isUpdating, setIsUpdating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const reselectOpenedForId = useRef<string | null>(null);
  const isMobile = useScreenMatch();

  useEffect(() => {
    if (isAuth && me) {
      const list = me.addresses || [];
      setAddresses(list);

      if (list.length === 0) {
        setSelectedId('');
        clearSelectedAddress?.();
        return;
      }

      const currentId = selectedIdRef.current;
      const stillThere = currentId ? list.find((a) => a.id === currentId) : undefined;
      if (stillThere) {
        if (isCheckoutReadyAddress(stillThere)) {
          onSelectAddress(stillThere);
        }
        return;
      }

      const shippable = list.filter((a) => isCheckoutReadyAddress(a));
      const defaultAddress =
        shippable.find((a) => a.isDefaultShippingAddress) ||
        shippable.find((a) => a.isDefaultBillingAddress) ||
        shippable[0];

      if (defaultAddress) {
        setSelectedId(defaultAddress.id);
        onSelectAddress(defaultAddress);
      } else {
        setSelectedId('');
        clearSelectedAddress?.();
      }
      return;
    }

    if (!isAuth) {
      const draft = loadGuestShippingAddress();
      setAddresses(draft ? [draft] : []);
      if (draft && isCheckoutReadyAddress(draft)) {
        setSelectedId(draft.id);
        onSelectAddress(draft);
      } else {
        setSelectedId('');
        if (!draft) clearSelectedAddress?.();
      }
    }
  }, [me, isAuth, onSelectAddress, clearSelectedAddress]);

  useEffect(() => {
    if (isAuth) return;
    return subscribeGuestShippingAddress((draft) => {
      setAddresses(draft ? [draft] : []);
      if (draft && isCheckoutReadyAddress(draft)) {
        setSelectedId(draft.id);
        onSelectAddress(draft);
      } else {
        setSelectedId('');
        clearSelectedAddress?.();
      }
    });
  }, [isAuth, onSelectAddress, clearSelectedAddress]);

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

  /** Soft-gate: старый ПВЗ без кода — открыть drawer с явным CTA */
  useEffect(() => {
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr || !needsDeliveryPointReselection(addr)) return;
    if (reselectOpenedForId.current === addr.id) return;
    reselectOpenedForId.current = addr.id;
    toast.error('Перевыберите пункт выдачи — в адресе нет кода ПВЗ');
    dispatch(openAddressDrawer({ address: addr }));
  }, [addresses, selectedId, dispatch, toast]);

  const handleAddAddress = () => {
    dispatch(openAddressDrawer());
  };

  const handleSelectionChange = async (address: AddressInfo) => {
    if (isUpdating) return;

    if (!isCheckoutReadyAddress(address)) {
      toast.error(
        needsDeliveryPointReselection(address)
          ? 'Перевыберите пункт выдачи — в адресе нет кода ПВЗ'
          : 'Выберите адрес со способом доставки (СДЭК или Яндекс)',
      );
      dispatch(openAddressDrawer({ address }));
      return;
    }

    // Только выбор для checkout — без set-default / toast (шум при нескольких адресах).
    setSelectedId(address.id);
    onSelectAddress(address);
  };

  const handleSetDefault = async (address: AddressInfo) => {
    if (!isAuth || isUpdating) {
      setOpenMenuId(null);
      return;
    }
    if (address.isDefaultShippingAddress) {
      setOpenMenuId(null);
      return;
    }

    setIsUpdating(true);
    setOpenMenuId(null);
    try {
      await setDefaultAddressService(address.id, AddressTypeEnum.SHIPPING);
      await dispatch(getMe());
      toast.success('Адрес установлен как адрес по умолчанию');
    } catch (error: unknown) {
      console.error('Failed to set default address:', error);
      const msg = error instanceof Error ? error.message : 'Ошибка при установке адреса по умолчанию';
      toast.error(msg);
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

    if (!isAuth) {
      clearGuestShippingAddress();
      setAddresses([]);
      setSelectedId('');
      clearSelectedAddress?.();
      setOpenMenuId(null);
      toast.success('Адрес удалён');
      return;
    }

    try {
      await deleteAddress(addressId);
      if (selectedId === addressId) {
        setSelectedId('');
        clearSelectedAddress?.();
      }
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
    <div
      className={`${styles.deliveryProfile} ${hasError ? styles.hasError : ''}`}
      data-checkout-field="address"
    >
      <article className={styles.headerWrapper}>
        <h2 className={styles.title}>Адреса доставки</h2>
        {!isMobile && (
          <button type="button" className={styles.addAddress} onClick={handleAddAddress}>
            + новый адрес
          </button>
        )}
      </article>

      {addresses.length === 0 ? (
        <p className={styles.emptyText}>
          {isAuth
            ? 'Нет сохраненных адресов'
            : 'Укажите адрес доставки — вход не обязателен'}
        </p>
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
                        {[address.firstName, address.lastName].filter(Boolean).join(' ') ||
                          'Получатель не указан'}
                      </p>
                      <p className={styles.deliveryType}>
                        Тип доставки: {getDeliveryTypeLabelFromStreet2(address.streetAddress2)}
                      </p>
                      <p className={styles.address}>{formatProfileShippingAddressLine(address)}</p>
                      {needsDeliveryPointReselection(address) ? (
                        <p className={styles.reselectHint} role="status">
                          Нужно заново выбрать пункт выдачи
                        </p>
                      ) : null}
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
                    type="button"
                    className={styles.more}
                    aria-label="Действия с адресом"
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === address.id}
                    onClick={(e) => handleMenuToggle(address.id, e)}
                  >
                    ⋯
                  </button>
                  {openMenuId === address.id && (
                    <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => handleEdit(address)}
                      >
                        Изменить
                      </button>
                      {isAuth && !address.isDefaultShippingAddress ? (
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.menuItem}
                          onClick={() => void handleSetDefault(address)}
                        >
                          Сделать основным
                        </button>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
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
      {hasError && errorMessage ? (
        <p className={styles.errorText} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isMobile && (
        <button onClick={handleAddAddress} className={styles.addBtn}>
          + Новый адрес
        </button>
      )}
    </div>
  );
};

export default DeliveryProfile;
