import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

// CREATE CUSTOMER
export async function createCustomer(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;

    const {
      name,
      phone,
      email,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    // Check duplicate phone inside same organization
    const [existingCustomers]: any = await db.execute(
      `SELECT id
       FROM customers
       WHERE organization_id = ?
       AND phone = ?`,
      [organizationId, phone]
    );

    if (existingCustomers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Customer with this phone already exists",
      });
    }

    const id = randomUUID();

    await db.execute(
      `INSERT INTO customers
       (
         id,
         organization_id,
         name,
         phone,
         email
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        name || null,
        phone,
        email || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: {
        id,
        organizationId,
        name: name || null,
        phone,
        email: email || null,
      },
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
}

// GET ALL CUSTOMERS
export async function getCustomers(
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
        phone,
        email,
        created_at,
        updated_at
       FROM customers
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
}

// GET CUSTOMER BY ID
export async function getCustomerById(
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
        phone,
        email,
        created_at,
        updated_at
       FROM customers
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
}

// UPDATE CUSTOMER
export async function updateCustomer(
  req: AuthRequest,
  res: Response
) {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    const {
      name,
      phone,
      email,
    } = req.body;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: "Organization not found in token",
      });
    }

    const [existingCustomers]: any = await db.execute(
      `SELECT id
       FROM customers
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (existingCustomers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (phone) {
      const [duplicateCustomers]: any = await db.execute(
        `SELECT id
         FROM customers
         WHERE organization_id = ?
         AND phone = ?
         AND id != ?`,
        [organizationId, phone, id]
      );

      if (duplicateCustomers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Another customer with this phone already exists",
        });
      }
    }

    await db.execute(
      `UPDATE customers
       SET
         name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email)
       WHERE id = ?
       AND organization_id = ?`,
      [
        name ?? null,
        phone ?? null,
        email ?? null,
        id,
        organizationId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
}

// DELETE CUSTOMER
export async function deleteCustomer(
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

    const [result]: any = await db.execute(
      `DELETE FROM customers
       WHERE id = ?
       AND organization_id = ?`,
      [id, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
}