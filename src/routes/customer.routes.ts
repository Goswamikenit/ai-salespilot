import { Router } from "express";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authenticateToken, createCustomer);

router.get("/", authenticateToken, getCustomers);

router.get("/:id", authenticateToken, getCustomerById);

router.put("/:id", authenticateToken, updateCustomer);

router.delete("/:id", authenticateToken, deleteCustomer);

export default router;