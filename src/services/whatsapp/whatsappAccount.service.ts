import { db } from "../../config/database";

export async function findWhatsAppAccount(
  phoneNumberId: string
) {
  const [rows]: any = await db.execute(
    `SELECT
      id,
      organization_id,
      phone_number_id,
      waba_id,
      business_id,
      phone_number,
      display_name,
      access_token
    FROM whatsapp_accounts
    WHERE phone_number_id = ?
    LIMIT 1`,
    [phoneNumberId]
  );

  return rows[0] || null;
}