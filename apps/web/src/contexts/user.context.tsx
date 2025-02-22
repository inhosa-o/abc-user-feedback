/**
 * Copyright 2023 LINE Corporation
 *
 * LINE Corporation licenses this file to you under the Apache License,
 * version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import axios from 'axios';
import dayjs from 'dayjs';
import type { JwtPayload } from 'jwt-decode';
import jwtDecode from 'jwt-decode';
import { useSessionStorage } from 'react-use';

import isServer from '@/constants/is-server';
import { Path } from '@/constants/path';
import client from '@/libs/client';
import type { IFetchError } from '@/types/fetch-error.type';

export type UserTypeEnum = 'SUPER' | 'GENERAL';

type UserType = {
  id: number;
  email: string;
  type: UserTypeEnum;
  name: string;
  department: string | null;
  signUpMethod: 'OAUTH' | 'EMAIL';
};
export type JwtType = {
  accessToken: string;
  refreshToken: string;
};

interface ISignInOAuthInput {
  code: string;
  callback_url?: string;
}
interface ISignInInput {
  email: string;
  password: string;
  remember: boolean;
}

interface ISignUpInput {
  email: string;
  password: string;
}

export interface IUserContext {
  user: UserType | null;
  signInOAuth: (input: ISignInOAuthInput) => Promise<void>;
  signIn: (input: ISignInInput) => Promise<void>;
  signUp: (input: ISignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  jwt: JwtType | null;
  isInitialized: boolean;
  refetch: () => Promise<any>;
}

export const UserContext = createContext<IUserContext>({
  user: null,
  signInOAuth: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  jwt: null,
  isInitialized: false,
  refetch: async () => {},
});

export const UserProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [jwt, setJwt] = useSessionStorage<JwtType | null>('jwt', null);
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  const { refetch } = useQuery({
    queryKey: ['/api/users/{id}', jwt],
    queryFn: async () => {
      if (!jwt) return;
      const { accessToken } = jwt;
      const { sub, exp } = jwtDecode<JwtPayload>(accessToken);

      if (!sub || dayjs().isBefore(dayjs(exp))) {
        setJwt(null);
        return;
      }
      try {
        const { data } = await client.get({
          path: '/api/users/{id}',
          pathParams: { id: parseInt(sub) },
          options: { headers: { Authorization: `Bearer ${accessToken}` } }, // session storage delay
        });

        setUser(data);

        return data;
      } catch (error) {
        setJwt(null);
      }
    },
    enabled: !!jwt,
  });

  useEffect(() => {
    (async () => {
      if (isServer) return;
      setIsInitialized(false);

      const { data } = await axios.get('/api/jwt');
      if (data?.jwt) setJwt(data.jwt);
      setIsInitialized(true);
    })();
  }, []);

  const signIn = async (body: ISignInInput) => {
    try {
      const { data } = await axios.post('/api/login', body);
      setJwt(data);
      if (router.query.callback_url) {
        router.push(router.query.callback_url as string);
      } else {
        router.push({ pathname: Path.MAIN });
      }
    } catch (error) {
      throw (error as AxiosError).response?.data as IFetchError;
    }
  };

  const signInOAuth = async ({ code, callback_url }: ISignInOAuthInput) => {
    try {
      const { data } = await axios.post('/api/oauth', { code, callback_url });
      setJwt(data);
      if (router.query.callback_url) {
        router.push(router.query.callback_url as string);
      } else {
        router.push({ pathname: Path.MAIN });
      }
    } catch (error) {
      throw (error as AxiosError).response?.data as IFetchError;
    }
  };

  const signUp = useCallback(async ({ email, password }: ISignUpInput) => {
    await client.post({
      path: '/api/auth/signUp/email',
      body: { email, password, department: null },
    });
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setJwt(null);
    await axios.get('/api/logout');
    router.push(Path.SIGN_IN);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        signIn,
        signUp,
        signOut,
        jwt,
        isInitialized,
        refetch,
        signInOAuth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  return useContext(UserContext);
}
