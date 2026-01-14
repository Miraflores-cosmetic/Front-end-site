import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {SpinnerLoader} from './SpinnerLoader'

export const Spinner = () => {
    const {  signIn, signUp } = useSelector(
    (state: RootState) => state.authSlice
  );

  if(signIn.loadingStatus || signUp.loadingStatus ){

  return <SpinnerLoader/>
 
  } else {
    return null
  }
};
