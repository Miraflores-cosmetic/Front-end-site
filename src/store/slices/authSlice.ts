import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import {
  signUpService,
  getToken,
  getMeInfo,
  updateAccount,
  revokeSession,
} from '@/api/authApi';
import { migrateGuestFavoritesToUser } from '@/services/favorites.service';
import type { AuthTokenResult } from '@/types/auth';
import { AuthState, MeInfo, ResultType, SignUpArgs } from '@/types/auth';
import { clearAuthStorage } from '@/api/apiClient';

/** Сеть / обрыв — не считаем сессию недействительной */
function isTransientGetMeFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('aborted') ||
    m.includes('aborterror') ||
    m.includes('timeout')
  );
}

/** Разлогин только при явном ответе API о недействительной авторизации */
export function isAuthSessionInvalidMessage(message: string): boolean {
  if (!message?.trim()) return false;
  if (isTransientGetMeFailure(message)) return false;
  const m = message;
  return (
    m.includes('TokenExpired') ||
    m.includes('PermissionDenied') ||
    m.includes('Unauthorized') ||
    m.includes('401') ||
    m.includes('Signature has expired') ||
    m.includes('ExpiredSignatureError') ||
    m.includes('Сессия истекла') ||
    m.includes('Неверный email или пароль') ||
    (m.includes('expired') &&
      (m.includes('Signature') || m.includes('token') || m.includes('Token')))
  );
}

function applyLoggedOut(state: AuthState) {
  state.isAuth = false;
  state.token = null;
  state.me = null;
  state.email = '';
  state.signIn.success = false;
  state.signUp.success = false;
}

export const sendSignUpData = createAsyncThunk<ResultType, SignUpArgs>(
  'auth/sendSignUpData',
  async ({ email, password, consentMarketing }) => {
    return signUpService(email, password, consentMarketing === true);
  },
);

export const sendSignInData = createAsyncThunk<AuthTokenResult, SignUpArgs>(
  'auth/sendSignInData',
  async ({ email, password }) => getToken(email, password),
);

export const getMe = createAsyncThunk<MeInfo>('auth/getMe', async () => {
  const result = await getMeInfo();
  if (result?.id) {
    localStorage.setItem('userId', result.id);
    await migrateGuestFavoritesToUser(result.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('favoritesUpdated'));
    }
  }
  return result;
});

/** Revoke JWT на сервере + очистка local/session storage. */
export const logout = createAsyncThunk('auth/logout', async () => {
  await revokeSession();
});

export const updateAccountAction = createAsyncThunk<
  { firstName?: string; lastName?: string },
  { firstName?: string; lastName?: string }
>('auth/updateAccount', async ({ firstName, lastName }, { rejectWithValue }) => {
  try {
    const result = await updateAccount(firstName, lastName);
    if (!result) {
      return rejectWithValue('Ошибка при обновлении аккаунта');
    }
    return {
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Ошибка при обновлении аккаунта';
    return rejectWithValue(msg);
  }
});

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  return token && token !== 'null' && token !== 'undefined' ? token : null;
};

const initialState: AuthState = {
  email: '',
  signUp: {
    agreeChecked: false,
    success: false,
    loadingStatus: false,
    error: null,
  },
  signIn: {
    success: false,
    loadingStatus: false,
    error: null,
  },
  getMe: {
    loadingStatus: false,
    error: null,
  },
  isAuth: !!getStoredToken(),
  token: getStoredToken(),
  me: null,
};

const authSlice = createSlice({
  name: 'authSlice',
  initialState,
  reducers: {
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
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
    clearSignInSuccess(state) {
      state.signIn.success = false;
    },
    clearSignInError(state) {
      state.signIn.error = null;
    },
    clearSignUpSuccessOnly(state) {
      state.signUp.success = false;
    },
    resetSignUp(state) {
      state.email = '';
      state.signUp.success = false;
      state.signUp.error = null;
      state.signUp.agreeChecked = false;
      localStorage.removeItem('email');
    },
    /** Только локальный сброс (токен уже невалиден / 401 handler). */
    clearLocalSession(state) {
      applyLoggedOut(state);
      clearAuthStorage();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendSignUpData.pending, (state) => {
        state.signUp.loadingStatus = true;
        state.signUp.error = null;
      })
      .addCase(sendSignUpData.fulfilled, (state, action) => {
        state.signUp.success = action.payload?.otpSent === true;
        state.signUp.loadingStatus = false;
        state.signUp.error = null;
        if (action.payload?.email) {
          state.email = action.payload.email;
          localStorage.setItem('email', action.payload.email);
        }
      })
      .addCase(sendSignUpData.rejected, (state, action) => {
        state.signUp.loadingStatus = false;
        state.signUp.error = action.error;
      })
      .addCase(sendSignInData.pending, (state) => {
        state.signIn.loadingStatus = true;
        state.signIn.error = null;
      })
      .addCase(sendSignInData.fulfilled, (state, action) => {
        state.signIn.success = true;
        state.isAuth = true;
        state.token = action.payload.token;
        // JWT уже в LS через setAccessToken в getToken
        state.signIn.loadingStatus = false;
        state.signIn.error = null;
      })
      .addCase(sendSignInData.rejected, (state, action) => {
        state.signIn.loadingStatus = false;
        state.signIn.error = action.error;
      })
      .addCase(getMe.pending, (state) => {
        state.getMe.loadingStatus = true;
        state.getMe.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        if (action.payload) {
          state.me = action.payload;
          state.isAuth = true;
          const storedToken = localStorage.getItem('token');
          if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
            state.token = storedToken;
          }
          if (action.payload.id) {
            localStorage.setItem('userId', action.payload.id);
          }
        } else {
          state.isAuth = false;
          state.me = null;
          state.token = null;
        }
        state.getMe.loadingStatus = false;
        state.getMe.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.getMe.loadingStatus = false;
        state.getMe.error = action.error;

        const msg = String(action.error?.message ?? '');
        if (!isAuthSessionInvalidMessage(msg)) {
          return;
        }

        applyLoggedOut(state);
        clearAuthStorage();
      })
      .addCase(logout.fulfilled, (state) => {
        applyLoggedOut(state);
      })
      .addCase(logout.rejected, (state) => {
        applyLoggedOut(state);
        clearAuthStorage();
      })
      .addCase(updateAccountAction.fulfilled, (state, action) => {
        if (state.me && action.payload) {
          if (action.payload.firstName !== undefined) {
            state.me.firstName = action.payload.firstName;
          }
          if (action.payload.lastName !== undefined) {
            state.me.lastName = action.payload.lastName;
          }
        }
      })
      .addCase(updateAccountAction.rejected, (_state, action) => {
        console.error('Update account rejected:', action.payload);
      });
  },
});

export const {
  setEmail,
  switchSignUpAgreement,
  setFalseSignUpAgreement,
  clearSignInSuccess,
  clearSignInError,
  clearSignUpSuccessOnly,
  resetSignUp,
  clearLocalSession,
} = authSlice.actions;

export default authSlice.reducer;
