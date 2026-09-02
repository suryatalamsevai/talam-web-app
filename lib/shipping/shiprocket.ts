import {
  assignShiprocketAwb,
  createShiprocketOrder,
  getShiprocketTrackingStatus,
  ShiprocketLoginError,
  shiprocketLogin,
  type ShiprocketOrderInput,
  type ShiprocketShipment,
  type ShiprocketTrackingStatus,
} from './shiprocket-client'
import {
  getDecryptedShiprocketCredential,
  getShippingConfig,
  markShiprocketCredentialStale,
} from './shiprocket-account'

/**
 * Creates a shipment in *the tenant's own* Shiprocket account.
 *
 * Model A: every shop holds its own Shiprocket account, so its own KYC, bank account, COD
 * remittance and RTO liability. Talam never ships under a shared platform account — see
 * docs/superpowers/specs/2026-08-19-shiprocket-integration-design.md for the PoC this
 * replaced.
 */

export type {
  ShiprocketOrderInput,
  ShiprocketShipment,
  ShiprocketTrackingActivity,
  ShiprocketTrackingStatus,
} from './shiprocket-client'

export async function createShiprocketShipment(
  tenantId: string,
  input: ShiprocketOrderInput
): Promise<ShiprocketShipment> {
  const credential = await getDecryptedShiprocketCredential(tenantId)
  if (!credential) throw new Error('No Shiprocket account is connected for this store.')

  const config = await getShippingConfig(tenantId)
  if (!config.pickupLocation) {
    throw new Error('No Shiprocket pickup location is configured for this store.')
  }

  let token: string
  try {
    token = await shiprocketLogin(credential.email, credential.password)
  } catch (err) {
    // Only an actual 401/403 means the shop rotated their Shiprocket password — anything
    // else (5xx, rate limit, network hiccup) is transient and must not flip a working
    // credential to "needs reconnect", or block every retry with the wrong message.
    if (err instanceof ShiprocketLoginError && (err.status === 401 || err.status === 403)) {
      await markShiprocketCredentialStale(tenantId, err.message)
      throw new Error(
        'Your Shiprocket account could not be authenticated — reconnect it in Settings → Shipping.'
      )
    }
    throw new Error('Shiprocket could not be reached right now — try shipping this order again shortly.')
  }

  const { shipmentId } = await createShiprocketOrder(token, config.pickupLocation, input)
  const { awbCode, courierName } = await assignShiprocketAwb(token, shipmentId)

  return { awbCode, courierName, shipmentId }
}

/**
 * Reads live courier scans for one AWB from *the tenant's own* Shiprocket account.
 *
 * Throws on every failure — no Shiprocket account connected, login rejected, upstream 5xx,
 * timeout — because the only caller (lib/data/order-tracking.ts) already degrades to the
 * order's stored status. Deliberately does NOT call markShiprocketCredentialStale on a 401
 * the way createShiprocketShipment does: this runs on a customer-facing read, and a customer
 * refreshing a tracking screen must never be able to flip the shop's shipping config.
 */
export async function getShiprocketTracking(
  tenantId: string,
  awbCode: string
): Promise<ShiprocketTrackingStatus | null> {
  const credential = await getDecryptedShiprocketCredential(tenantId)
  if (!credential) throw new Error('No Shiprocket account is connected for this store.')

  const token = await shiprocketLogin(credential.email, credential.password)
  return getShiprocketTrackingStatus(token, awbCode)
}
