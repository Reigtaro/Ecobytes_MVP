import pool from './connection';

export async function getPermissionsByUserId(userId: number): Promise<string[]> {
  const [rows] = await pool.execute(
    `
    SELECT p.name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ?
      AND u.active = TRUE
      AND r.active = TRUE
    `,
    [userId]
  );

  return (rows as { name: string }[]).map(r => r.name);
}