/**
 * Platform Constants & Configuration
 * BarberPulse OS - Multi-Tenant SaaS
 */

/**
 * Designated platform superadmin email addresses.
 * Superadmins have full global authority across all tenants and direct access to company management.
 */
export const PLATFORM_SUPERADMIN_EMAILS = [
  'victortamayopine@gmail.com',
  'victortamayopinc@gmail.com',
  'danielb.alzate1@gmail.com'
];

/**
 * Helper to determine whether an email belongs to a platform superadmin.
 */
export function isPlatformSuperadminEmail(email) {
  if (!email) return false;
  return PLATFORM_SUPERADMIN_EMAILS.includes(email.toLowerCase().trim());
}

