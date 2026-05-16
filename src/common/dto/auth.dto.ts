export type JwtTokensDto = {
  accessToken: string;
  refreshToken: string;
};

export type SignupRequestDto = {
  email: string;
  username: string;
  password: string;
};

export type LoginRequestDto = {
  emailOrUsername: string;
  password: string;
};

export type RefreshRequestDto = {
  refreshToken: string;
};

export type LogoutRequestDto = {
  refreshToken: string;
};
