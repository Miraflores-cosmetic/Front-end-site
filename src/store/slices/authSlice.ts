import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { signUpService, getToken, getMeInfo, updateAccount } from '@/graphql/queries/auth.service';
import { tokenCreate } from '@/graphql/types/auth.types';
import { AuthState, MeInfo, ResultType, SignUpArgs } from '@/types/auth'

export const sendSignUpData = createAsyncThunk<ResultType, SignUpArgs>(
  'auth/sendSignUpData',
  async ({ email, pass }) => {
    const result = await signUpService(email, pass);
    return result;
  }
);

export const sendSignInData = createAsyncThunk<tokenCreate, SignUpArgs>(
  'auth/sendSignInData',
  async ({ email, pass }) => {
    const result = await getToken(email, pass);
    return result;
  }
);

export const getMe = createAsyncThunk<MeInfo>(
  'auth/getMe',
  async () => {
    const result = await getMeInfo();
    return result;
  }
);

export const updateAccountAction = createAsyncThunk<
  { firstName?: string; lastName?: string },
  { firstName?: string; lastName?: string }
>(
  'auth/updateAccount',
  async ({ firstName, lastName }, { rejectWithValue }) => {
    try {
      const result = await updateAccount(firstName, lastName);
      if (!result) {
        return rejectWithValue('Failed to update account');
      }
      return { 
        firstName: result.firstName || undefined, 
        lastName: result.lastName || undefined 
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update account');
    }
  }
);

// Восстанавливаем токен из localStorage при инициализации
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  return token && token !== 'null' && token !== 'undefined' ? token : null;
};

const initialState: AuthState = {
  email: '',
  pass: '',
  signUp: {
    agreeChecked: false,
    success: false,
    loadingStatus: false,
    error: null
  },
  signIn: {
    success: false,
    loadingStatus: false,
    error: null
  },
  getMe:{
    loadingStatus: false,
    error: null
  },
  isAuth: !!getStoredToken(),
  token: getStoredToken(),
  me: null
};

const authSlice = createSlice({
  name: 'authSlice',
  initialState,
  reducers: {
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
    },
    setPass(state, action: PayloadAction<string>) {
      state.pass = action.payload;
    },
    switchSignUpAgreement(state) {
      state.signUp.agreeChecked = !state.signUp.agreeChecked;
    },
    setFalseSignUpAgreement(state) {
      state.signUp.agreeChecked = false;
    },
    setSignUpSuccess(state) {
      state.signUp.success = true;
    },
    setFalseSignIiStatus(state) {
      state.signIn.success = false;
    },
    resetSignUp(state) {
      // Сбрасываем данные регистрации для возможности начать заново
      state.email = '';
      state.pass = '';
      state.signUp.success = false;
      state.signUp.error = null;
      state.signUp.agreeChecked = false;
      // Очищаем email из localStorage
      localStorage.removeItem('email');
    },
    logout(state) {
      // Очищаем состояние
      state.isAuth = false;
      state.token = null;
      state.me = null;
      state.email = '';
      state.pass = '';
      state.signIn.success = false;
      state.signUp.success = false;
      // Очищаем localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
    }
  },
  extraReducers: builder => {
    builder
      .addCase(sendSignUpData.pending, state => {
        state.signUp.loadingStatus = true;
        state.signUp.error = null;
      })
      .addCase(sendSignUpData.fulfilled, (state, action) => {
        state.signUp.success = true;
        state.signUp.loadingStatus = false;
        state.signUp.error = null;
        // Сохраняем email в Redux state и localStorage для отправки письма подтверждения
        // Email уже должен быть в state.email, но убеждаемся что он сохранен
        if (state.email) {
          localStorage.setItem('email', state.email);
          // Email уже в state.email, так что просто сохраняем в localStorage
        }
      })
      .addCase(sendSignUpData.rejected, (state, action) => {
        state.signUp.loadingStatus = false;
        state.signUp.error = action.error;
      })
      .addCase(sendSignInData.pending, state => {
        state.signIn.loadingStatus = true;
        state.signIn.error = null;
      })
      .addCase(sendSignInData.fulfilled, (state, action) => {
        console.log(action.payload);
        state.signIn.success = true;
        state.isAuth = true;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token ?? '');
        localStorage.setItem('refreshToken', action.payload.refreshToken ?? '');
        state.pass = '';
        state.signIn.loadingStatus = false;
        state.signIn.error = null;
      })
      .addCase(sendSignInData.rejected, (state, action) => {
        state.signIn.loadingStatus = false;
        state.signIn.error = action.error;
      })
      .addCase(getMe.pending, state => {
        state.getMe.loadingStatus = true;
        state.getMe.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        if (action.payload) {
          state.me = action.payload;
          state.isAuth = true;
          // Убеждаемся, что токен сохранен в состоянии и в localStorage
          const storedToken = localStorage.getItem('token');
          if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
            state.token = storedToken;
          }
          if (action.payload.id) {
            localStorage.setItem('userId', action.payload.id);
          }
        } else {
          // Если payload null, сбрасываем авторизацию
          state.isAuth = false;
          state.me = null;
          state.token = null;
        }
        state.getMe.loadingStatus = false;
        state.getMe.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        // Если getMe не удался, возможно токен невалидный
        state.isAuth = false;
        state.token = null;
        state.me = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        state.getMe.loadingStatus = false;
        state.getMe.error = action.error;
      })
      .addCase(updateAccountAction.pending, state => {
        // Можно добавить loading состояние если нужно
      })
      .addCase(updateAccountAction.fulfilled, (state, action) => {
        // Обновляем данные пользователя если они есть
        if (state.me && action.payload) {
          if (action.payload.firstName !== undefined) {
            state.me.firstName = action.payload.firstName;
          }
          if (action.payload.lastName !== undefined) {
            state.me.lastName = action.payload.lastName;
          }
        }
      })
      .addCase(updateAccountAction.rejected, (state, action) => {
        // Ошибка обрабатывается в компоненте через toast
        console.error('Update account rejected:', action.payload);
      });
  }
});

export const {
  setEmail,
  setPass,
  switchSignUpAgreement,
  setFalseSignUpAgreement,
  setFalseSignIiStatus,
  resetSignUp,
  logout
} = authSlice.actions;

export default authSlice.reducer;
