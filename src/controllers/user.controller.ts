import { Response } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "../config/database";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth.middleware";


// CREATE USER
export async function createUser(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserRole = req.user?.role;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (
      currentUserRole !== "OWNER" &&
      currentUserRole !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER or ADMIN can create users",
      });
    }

    const {
      name,
      email,
      password,
      role = "MEMBER",
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const validRoles = ["OWNER", "ADMIN", "MEMBER"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    // Only OWNER can create another OWNER
    if (
      role === "OWNER" &&
      currentUserRole !== "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can create an OWNER",
      });
    }

    const [existingUsers]: any = await db.execute(
      `SELECT id
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const id = randomUUID();

    await db.execute(
      `INSERT INTO users
       (
         id,
         organization_id,
         name,
         email,
         password_hash,
         role
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        name,
        email,
        passwordHash,
        role,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id,
        organizationId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
}


// GET ALL USERS
export async function getUsers(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        id,
        organization_id,
        name,
        email,
        role,
        created_at,
        updated_at
       FROM users
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
}


// GET USER BY ID
export async function getUserById(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [rows]: any = await db.execute(
      `SELECT
        id,
        organization_id,
        name,
        email,
        role,
        created_at,
        updated_at
       FROM users
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
}


// UPDATE USER
export async function updateUser(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserRole = req.user?.role;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (
      currentUserRole !== "OWNER" &&
      currentUserRole !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER or ADMIN can update users",
      });
    }

    const {
      name,
      email,
      password,
      role,
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email and role are required",
      });
    }

    const validRoles = ["OWNER", "ADMIN", "MEMBER"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    // Find user only inside current organization
    const [existingTargetUsers]: any = await db.execute(
      `SELECT id, role
       FROM users
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (existingTargetUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const targetUserRole =
      existingTargetUsers[0].role;

    // ADMIN cannot modify OWNER
    if (
      targetUserRole === "OWNER" &&
      currentUserRole !== "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can update an OWNER",
      });
    }

    // ADMIN cannot create/update someone as OWNER
    if (
      role === "OWNER" &&
      currentUserRole !== "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can assign OWNER role",
      });
    }

    const [existingUsers]: any = await db.execute(
      `SELECT id
       FROM users
       WHERE email = ?
       AND id != ?`,
      [email, id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      await db.execute(
        `UPDATE users
         SET
           name = ?,
           email = ?,
           password_hash = ?,
           role = ?
         WHERE id = ?
         AND organization_id = ?`,
        [
          name,
          email,
          passwordHash,
          role,
          id,
          organizationId,
        ]
      );
    } else {
      await db.execute(
        `UPDATE users
         SET
           name = ?,
           email = ?,
           role = ?
         WHERE id = ?
         AND organization_id = ?`,
        [
          name,
          email,
          role,
          id,
          organizationId,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
}


// DELETE USER
export async function deleteUser(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserRole = req.user?.role;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (
      currentUserRole !== "OWNER" &&
      currentUserRole !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER or ADMIN can delete users",
      });
    }

    const [targetUsers]: any = await db.execute(
      `SELECT role
       FROM users
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (targetUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ADMIN cannot delete OWNER
    if (
      targetUsers[0].role === "OWNER" &&
      currentUserRole !== "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can delete an OWNER",
      });
    }

    // Prevent deleting yourself
    if (id === req.user?.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const [result]: any = await db.execute(
      `DELETE FROM users
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
}


// LOGIN USER
export async function loginUser(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [rows]: any = await db.execute(
      `SELECT
        id,
        organization_id,
        name,
        email,
        password_hash,
        role
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organization_id,
        role: user.role,
      },
      secret,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          organizationId: user.organization_id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
}