import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { getPermissionsByUserId } from "../db/permissionModel";

export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const perms = await getPermissionsByUserId(req.user.userId);

      if (!perms.includes(permission)) {
        return res.status(403).json({ message: "No autorizado" });
      }

      next();
    } catch (err) {
      console.error("requirePermission error:", err);
      res.status(500).json({ message: "Error validando permisos" });
    }
  };
}
