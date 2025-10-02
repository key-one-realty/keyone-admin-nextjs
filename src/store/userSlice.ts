import { createSlice, PayloadAction } from '@reduxjs/toolkit';


interface UserState {
  id: string | null;
  name: string;
  email: string;
  avatar: string;
  roles: string[];
  permissions: string[];
  isLoggedIn: boolean;
}

const initialState: UserState = {
  id: null,
  name: '',
  email: '',
  avatar: '',
  roles: [],
  permissions: [],
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      return { ...action.payload, isLoggedIn: true };
    },
    clearUser: () => initialState,
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
