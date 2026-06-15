import bcryptjs from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
}

// Password hasheado de "Zfranca2024!"
const hashedPassword = bcryptjs.hashSync('Zfranca2024!', 10);

// Usuarios hardcodeados (temporal - luego se conectará a MySQL)
export const users: User[] = [
  {
    id: 1,
    email: 'admin@example.com',
    password: hashedPassword,
    name: 'Administrador'
  }
];

export const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const findUserById = (id: number): User | undefined => {
  return users.find(user => user.id === id);
};
