import { z } from 'zod';

// We define a strict schema that mirrors our policies
export const LoanSchema = z.object({
  loan_id: z.string().min(1, "Missing loan ID"),
  borrower_id: z.string().optional().or(z.literal('')),
  borrower_name: z.string().min(1, "Borrower name is empty"),
  property_state: z.string().regex(/^[A-Z]{2}$/, "Property state must be 2 uppercase letters").optional().or(z.literal('')),
  principal_balance: z.coerce.number().min(0, "Principal balance is negative"),
  original_principal: z.coerce.number().min(0, "Original principal is negative").optional().or(z.literal('')),
  current_balance: z.coerce.number().min(0, "Current balance is negative").optional().or(z.literal('')),
  interest_rate: z.coerce.number().min(0, "Interest rate is negative").max(25, "Interest rate > 25%"),
  origination_date: z.string().optional().or(z.literal('')),
  maturity_date: z.string().optional().or(z.literal('')),
  term_months: z.coerce.number().optional().or(z.literal('')),
  loan_purpose: z.string().optional().or(z.literal('')),
  payment_status: z.string().optional().or(z.literal('')),
  days_past_due: z.coerce.number().min(0, "Days past due is negative").optional().or(z.literal('')),
  document_status: z.string().optional().or(z.literal('')),
  loan_status: z.string().optional().or(z.literal('')),
  last_updated_at: z.string().optional().or(z.literal('')),
  source_system: z.string().optional().or(z.literal('')),
})
.refine(data => {
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
})
.refine(data => {
  if (data.current_balance !== undefined && data.original_principal !== undefined && data.current_balance !== '' && data.original_principal !== '') {
    return data.current_balance <= data.original_principal;
  }
  return true;
}, {
  message: "Current balance is greater than original principal",
  path: ["current_balance"]
})
.refine(data => {
  if (data.payment_status && data.payment_status.toLowerCase() === 'current') {
    return data.days_past_due === 0 || data.days_past_due === '' || data.days_past_due === undefined;
  }
  return true;
}, {
  message: "Payment status is current but days past due > 0",
  path: ["payment_status"]
})
.refine(data => {
  if (data.loan_status && data.loan_status.toLowerCase() === 'closed') {
    return data.current_balance === 0 || data.current_balance === '' || data.current_balance === undefined;
  }
  return true;
}, {
  message: "Loan is closed but current balance > 0",
  path: ["current_balance"]
});
