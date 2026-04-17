// src/middlewares/AuthMiddleware.js
import jwt from "jsonwebtoken";
import { OperationResult } from "../shared/OperationResult.js";

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json(
        new OperationResult(false, "Token de acceso requerido")
      );
    }

    const token = authHeader.split(" ")[1]; // Bearer TOKEN
    if (!token) {
      return res.status(401).json(
        new OperationResult(false, "Formato de token inválido")
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "claveSecreta123");
    req.user = decoded; // Agregar datos del usuario al request
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(
        new OperationResult(false, "Token expirado")
      );
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json(
        new OperationResult(false, "Token inválido")
      );
    } else {
      return res.status(500).json(
        new OperationResult(false, "Error en autenticación")
      );
    }
  }
};


export const verifyProjectAdmin = (projectMemberRepository) => {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const isMember = await projectMemberRepository.isMember(projectId, userId);
      if (!isMember) {
        return res.status(403).json(
          new OperationResult(false, "No eres miembro de este proyecto")
        );
      }

      const userRole = await projectMemberRepository.getUserRole(projectId, userId);
      if (!userRole || userRole.name !== "Administrador") {
        return res.status(403).json(
          new OperationResult(false, "Se requieren permisos de administrador")
        );
      }

      next();
    } catch (error) {
      console.error("verifyProjectAdmin error:", error);
      return res.status(500).json(
        new OperationResult(false, "Error verificando permisos")
      );
    }
  };
};


export const verifyProjectMember = (projectMemberRepository) => {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const isMember = await projectMemberRepository.isMember(projectId, userId);
      if (!isMember) {
        return res.status(403).json(
          new OperationResult(false, "No eres miembro de este proyecto")
        );
      }

      next();
    } catch (error) {
      console.error("verifyProjectMember error:", error);
      return res.status(500).json(
        new OperationResult(false, "Error verificando membresía")
      );
    }
  };
};
