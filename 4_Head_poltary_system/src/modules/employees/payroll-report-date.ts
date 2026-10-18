// Corrections belong to the payroll month, including historical corrections
// posted on a later date. Non-payroll entries retain their transaction date.
export const PAYROLL_REPORT_DATE =
  "COALESCE((SELECT make_date(run.period_year, run.period_month, 1) FROM salary_runs run WHERE run.id = le.source_id AND le.source_type = 'salary'), le.entry_date)";
