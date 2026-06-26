/**
 * IdGenerator port — id creation is injected so the domain/use-cases do not depend
 * on a concrete source of randomness and remain deterministic under test.
 */
export interface IdGenerator {
  next(): string
}
