/**
 * Money — the only type allowed to carry a monetary amount through the domain.
 *
 * design.md Decision 3: amounts are integer rupiah (IDR has no fractional unit in
 * practice). Storing/operating on integers makes the float-rounding class of bugs
 * (0.1 + 0.2 !== 0.3) impossible by construction, and centralises arithmetic so the
 * rest of the code cannot do lossy operations on raw numbers.
 *
 * Immutable value object: every operation returns a new Money.
 */
export class Money {
  /** Integer rupiah. Always a safe integer; the constructor guarantees it. */
  readonly amount: number

  private constructor(amount: number) {
    if (!Number.isInteger(amount)) {
      throw new RangeError(`Money must be an integer number of rupiah, got ${amount}`)
    }
    if (!Number.isSafeInteger(amount)) {
      throw new RangeError(`Money amount ${amount} exceeds safe integer range`)
    }
    this.amount = amount
  }

  static readonly ZERO = new Money(0)

  /** Construct from a whole number of rupiah. */
  static fromRupiah(amount: number): Money {
    return new Money(amount)
  }

  /** Construct from a stored integer (DB column / DTO). Alias for clarity at boundaries. */
  static fromInt(amount: number): Money {
    return new Money(amount)
  }

  plus(other: Money): Money {
    return new Money(this.amount + other.amount)
  }

  minus(other: Money): Money {
    return new Money(this.amount - other.amount)
  }

  negate(): Money {
    return new Money(-this.amount)
  }

  /** Multiply by an integer scalar (e.g. accrual rate × number of periods). */
  times(scalar: number): Money {
    if (!Number.isInteger(scalar)) {
      throw new RangeError(`Money.times expects an integer scalar, got ${scalar}`)
    }
    return new Money(this.amount * scalar)
  }

  isZero(): boolean {
    return this.amount === 0
  }

  isNegative(): boolean {
    return this.amount < 0
  }

  isPositive(): boolean {
    return this.amount > 0
  }

  equals(other: Money): boolean {
    return this.amount === other.amount
  }

  /** Negative, zero, or positive — mirrors Array.sort comparator semantics. */
  compare(other: Money): number {
    return this.amount - other.amount
  }

  /** Absolute value. */
  abs(): Money {
    return new Money(Math.abs(this.amount))
  }

  /** Serialise to the integer used in DTOs / DB columns. */
  toInt(): number {
    return this.amount
  }

  toJSON(): number {
    return this.amount
  }

  /** Sum a list of Money, returning ZERO for an empty list. */
  static sum(values: readonly Money[]): Money {
    return values.reduce((acc, v) => acc.plus(v), Money.ZERO)
  }
}
