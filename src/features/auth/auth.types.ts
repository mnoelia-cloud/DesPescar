export interface InterfaceAuth {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface errorAuth {
  status: number;
  message: string;
  errors?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };
  timestapm: string;
}
