import { z } from 'zod';

const strictNumber = (reqMsg, minMsg, minVal = 0, maxMsg, maxVal) => {
  let numSchema = z.number({ required_error: reqMsg, invalid_type_error: "Invalid numeric format" });
  if (minVal !== undefined) numSchema = numSchema.min(minVal, minMsg);
  if (maxVal !== undefined) numSchema = numSchema.max(maxVal, maxMsg);
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === 'string' && !/^-?\d+(\.\d+)?$/.test(val.trim())) return NaN;
    return Number(val);
  }, numSchema);
};

// We define a strict schema that mirrors our policies
export const LoanSchema = z.object({
  loan_id: z.string().min(1, "Missing loan ID"),
  borrower_id: z.string().optional().or(z.literal('')),
  borrower_name: z.string().min(1, "Borrower name is empty"),
  property_state: z.string().regex(/^[A-Z]{2}$/, "Property state must be 2 uppercase letters").optional().or(z.literal('')),
  principal_balance: strictNumber("Missing principal balance", "Principal balance is negative", 0),
  original_principal: strictNumber("Missing original principal", "Original principal is negative", 0).optional(),
  current_balance: strictNumber("Missing current balance", "Current balance is negative", 0).optional(),
  interest_rate: strictNumber("Missing interest rate", "Interest rate is negative", 0, "Interest rate > 25%", 25),
  origination_date: z.string().min(1, "Missing origination date").regex(/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}T?/, "Invalid origination date format"),
  maturity_date: z.string().min(1, "Missing maturity date").regex(/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}T?/, "Invalid maturity date format"),
  term_months: z.coerce.number().optional().or(z.literal('')),
  loan_purpose: z.string().optional().or(z.literal('')),
  payment_status: z.string().optional().or(z.literal('')),
  days_past_due: strictNumber("Missing days past due", "Days past due is negative", 0).optional(),
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
