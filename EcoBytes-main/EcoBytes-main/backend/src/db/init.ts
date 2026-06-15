import pool, { createConnection, dbName } from './connection';
import bcryptjs from 'bcryptjs';
import { devLog } from '../utils/logger';

export const initDatabase = async (): Promise<void> => {
  try {
    // Primero crear la base de datos si no existe
    const connection = await createConnection();
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();
    devLog(`Base de datos '${dbName}' creada/verificada correctamente`);

    // Crear tabla de permisos
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        menu VARCHAR(100) NOT NULL,
        submenu VARCHAR(100) NOT NULL,
        menu_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    devLog('Tabla permissions creada/verificada correctamente');

    // Crear tabla de roles
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    devLog('Tabla roles creada/verificada correctamente');

    // Crear tabla pivote rol-permisos
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    devLog('Tabla role_permissions creada/verificada correctamente');

    // Crear tabla de usuarios (con role_id)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role_id INT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
      )
    `);
    devLog('Tabla users creada/verificada correctamente');

    // Crear rol Administrador si no existe
    const [roles] = await pool.execute(
      'SELECT id FROM roles WHERE name = ?',
      ['Administrador']
    );

    let adminRoleId: number;
    if ((roles as unknown[]).length === 0) {
      const [result] = await pool.execute(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        ['Administrador', 'Acceso total al sistema']
      );
      adminRoleId = (result as { insertId: number }).insertId;
      devLog('Rol Administrador creado');
    } else {
      adminRoleId = (roles as { id: number }[])[0].id;
      devLog('Rol Administrador ya existe');
    }

    // Asignar TODOS los permisos al rol administrador (incluyendo nuevos)
    const [allPermissions] = await pool.execute('SELECT id FROM permissions');
    for (const perm of allPermissions as { id: number }[]) {
      await pool.execute(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [adminRoleId, perm.id]
      );
    }
    devLog('Permisos del Administrador actualizados');

    // Verificar si existe el usuario admin
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@example.com']
    );

    if ((users as unknown[]).length === 0) {
      const hashedPassword = await bcryptjs.hash('admin123', 10);
      await pool.execute(
        'INSERT INTO users (email, password, name, role_id) VALUES (?, ?, ?, ?)',
        ['admin@example.com', hashedPassword, 'Administrador', adminRoleId]
      );
      devLog('Usuario admin creado: admin@example.com / admin123');
    } else {
      devLog('Usuario admin ya existe');
    }

  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
};
