/**
 * Shared contact information for Mapato
 * Update these values to change contact details site-wide.
 */

export const CONTACT_INFO = {
  phone: "+254758947124",
  email: "bangali@ultimotradingltd.co.ke",
  whatsapp: "+254758947124",
  address: "Nairobi, Kenya",
  supportEmail: "bangali@ultimotradingltd.co.ke",
  legalEmail: "bangali@ultimotradingltd.co.ke",
} as const

export type ContactInfo = typeof CONTACT_INFO
