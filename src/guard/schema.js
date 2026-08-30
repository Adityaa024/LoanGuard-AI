import { z } from 'zod';

// We define a strict schema that mirrors our policies
export const LoanSchema = z.object({
  loan_id: z.string().min(1, "Missing loan ID"),
  borrower_name: z.string().min(1, "Borrower name is empty"),
  property_state: z.string().regex(/^[A-Z]{2}$/, "Property state must be 2 uppercase letters").optional().or(z.literal('')),
  principal_balance: z.coerce.number().min(0, "Principal balance is negative"),
  interest_rate: z.coerce.number().min(0, "Interest rate is negative").max(25, "Interest rate > 25%"),
  origination_date: z.string().optional().or(z.literal('')),
  maturity_date: z.string().optional().or(z.literal(''))
}).refine(data => {
  if (data.origination_date && data.maturity_date) {
    const orig = new Date(data.origination_date);
    const mat = new Date(data.maturity_date);
    if (!isNaN(orig.getTime()) && !isNaN(mat.getTime())) {
      return mat > orig;
    }
  }
  return true;
}, {
  message: "Maturity date is not after origination date",
  path: ["maturity_date"]
});
