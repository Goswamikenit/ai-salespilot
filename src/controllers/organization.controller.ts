import { Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";


// CREATE ORGANIZATION
export async function createOrganization(
  req: AuthRequest,
  res: Response
) {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const [existingOrganizations]: any = await db.execute(
      `SELECT id
       FROM organizations
       WHERE slug = ?`,
      [slug]
    );

    if (existingOrganizations.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Organization slug already exists",
      });
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO organizations
       (id, name, slug)
       VALUES (?, ?, ?)`,
      [id, name, slug]
    );

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: {
        id,
        name,
        slug,
      },
    });
  } catch (error) {
    console.error("Create organization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create organization",
    });
  }
}


// GET CURRENT ORGANIZATION
export async function getOrganizations(
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
        name,
        slug,
        created_at,
        updated_at
       FROM organizations
       WHERE id = ?`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get organizations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization",
    });
  }
}


// GET ORGANIZATION BY ID
export async function getOrganizationById(
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

    // User can access only their own organization
    if (id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You cannot access another organization",
      });
    }

    const [rows]: any = await db.execute(
      `SELECT
        id,
        name,
        slug,
        created_at,
        updated_at
       FROM organizations
       WHERE id = ?`,
      [organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get organization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization",
    });
  }
}


// UPDATE ORGANIZATION
export async function updateOrganization(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const currentUserRole = req.user?.role;
    const { id } = req.params;
    const { name, slug } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You cannot update another organization",
      });
    }

    if (
      currentUserRole !== "OWNER" &&
      currentUserRole !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only OWNER or ADMIN can update organization",
      });
    }

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    const [existingSlugs]: any = await db.execute(
      `SELECT id
       FROM organizations
       WHERE slug = ?
       AND id != ?`,
      [slug, organizationId]
    );

    if (existingSlugs.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Organization slug already exists",
      });
    }

    const [result]: any = await db.execute(
      `UPDATE organizations
       SET
         name = ?,
         slug = ?
       WHERE id = ?`,
      [name, slug, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: {
        id: organizationId,
        name,
        slug,
      },
    });
  } catch (error) {
    console.error("Update organization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update organization",
    });
  }
}


// DELETE ORGANIZATION
export async function deleteOrganization(
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

    if (id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete another organization",
      });
    }

    // Only OWNER can delete organization
    if (currentUserRole !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only OWNER can delete organization",
      });
    }

    const [result]: any = await db.execute(
      `DELETE FROM organizations
       WHERE id = ?`,
      [organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    console.error("Delete organization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete organization",
    });
  }
}