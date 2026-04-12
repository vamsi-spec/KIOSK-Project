// Central billing constants — values here are defaults only
// Per-provider overrides come from ProviderConfig table

export const BILLING = {
  // Payment state timeout — auto-reset PAYMENT_IN_PROGRESS after this many minutes
  PAYMENT_TIMEOUT_MINUTES: 15,

  // Scheduled job runs every N minutes to find stuck PAYMENT_IN_PROGRESS bills
  PAYMENT_RESET_JOB_INTERVAL_MINUTES: 5,

  // Default late fee rate (used only if ProviderConfig not found)
  DEFAULT_LATE_FEE_RATE_PER_MONTH: 0.015,

  // Default grace days before late fee starts
  DEFAULT_LATE_FEE_GRACE_DAYS: 0,

  // Max payment attempts per bill per day
  MAX_PAYMENT_ATTEMPTS_PER_DAY: 3,

  // OTP TTL for account linking verification (seconds)
  LINK_OTP_TTL_SECONDS: 300,

  // OTP resend cooldown for account linking (seconds)
  LINK_OTP_COOLDOWN_SECONDS: 60,

  // How many past meter readings to show in history
  METER_HISTORY_COUNT: 6,

  // How many past bills to show in bill list
  BILL_HISTORY_COUNT: 12
}