import styles from './DrawerWrapper.module.scss';
import 'react-modern-drawer/dist/index.css';

import Drawer from 'react-modern-drawer';

import { useDispatch, useSelector } from 'react-redux';
import BasketDrawer from './basket-drawer/BasketDrawer';
import MenuDrawer from './menu-drawer/MenuDrawer';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { RootState } from '@/store/store';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import AboutDrawer from './about-drawer/AboutDrawer';
import AddCommentDrawer from './add-comment-drawer/AddComment';
import AddressDrawer from './adress-drawer/AddressDrawer';
import React from 'react';

const DrawerWrapper: React.FC = () => {
  const activeDrawer = useSelector((state: RootState) => state.drawer.activeDrawer);
  const dispatch = useDispatch();

  const isAdress = activeDrawer === 'address' ? true : false;

  const isOpenBasket = activeDrawer === 'basket' ? true : false;
  const isOpenMenu = activeDrawer === 'menu' ? true : false;
  const isOpenAbout = activeDrawer === 'about' ? true : false;
  const isAddComment = activeDrawer === 'add-comment' ? true : false;
  const isMobileBasket = useScreenMatch(664);
  const isMobile = useScreenMatch(450);

  // Добавляем/удаляем класс на body когда drawer открыт
  React.useEffect(() => {
    if (activeDrawer) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }
    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [activeDrawer]);

  return (
    <>
      <Drawer
        className='basket-drawer'
        open={isOpenBasket}
        onClose={() => dispatch(closeDrawer())}
        size={isMobileBasket ? '100%' : 664}
        direction='right'
      >
        <BasketDrawer />
      </Drawer>
      <Drawer
        className={`${styles.drawerContainer} menu-drawer`}
        open={isOpenMenu}
        onClose={() => dispatch(closeDrawer())}
        size={'100%'}
        duration={400}
        direction='right'
      >
        <MenuDrawer />
      </Drawer>
      <Drawer
        className={styles.drawerContainer}
        open={isOpenAbout}
        onClose={() => dispatch(closeDrawer())}
        size={isMobile ? '100%' : 450}
        duration={400}
        direction='right'
      >
        <AboutDrawer />
      </Drawer>
      <Drawer
        className={styles.drawerContainer}
        open={isAddComment}
        onClose={() => dispatch(closeDrawer())}
        size={isMobile ? '100%' : 552}
        duration={400}
        direction='right'
      >
        <AddCommentDrawer />
      </Drawer>
            <Drawer
        className={styles.drawerContainer}
        open={isAdress}
        onClose={() => dispatch(closeDrawer())}
        size={isMobile ? '100%' : 450}
        duration={400}
        direction='right'
      >
        <AddressDrawer />
      </Drawer>
    </>
  );
};

export default DrawerWrapper;
