import { ProductSession, SnapshotPair } from '../types'
import { migratePairedModelToSnapshots } from './paired-model-to-snapshots'

/**
 * Compatibility bridge: projects still store paired Base/Active fields, but
 * the rest of the application can consume independent Reference/Current snapshots.
 */
export function sessionToSnapshotPair(session: ProductSession): SnapshotPair {
  return migratePairedModelToSnapshots({
    id: session.id,
    product: session.product,
    rates: session.rates,
    bom: session.bom,
    routing: session.routing,
    status: session.status,
    sourceRef: `session:${session.id}`
  })
}
