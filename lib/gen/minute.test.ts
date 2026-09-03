import { describe, expect, it } from "vitest"
import {
  dayStartMinute,
  formatEdition,
  formatMinuteUtc,
  minuteId,
  minuteIndexAt,
  minuteProgress,
  parseMinuteId,
} from "./minute"

describe("minute ids", () => {
  it("round-trips an id through parse and format", () => {
    const minute = minuteIndexAt(new Date("2026-09-03T21:42:17Z"))
    expect(minuteId(minute)).toBe("20260903-2142")
    expect(parseMinuteId("20260903-2142")).toBe(minute)
  })

  it("rejects malformed and impossible ids", () => {
    expect(parseMinuteId("2026-09-03")).toBeNull()
    expect(parseMinuteId("20261340-0000")).toBeNull()
    expect(parseMinuteId("19691231-2359")).toBeNull()
  })

  it("formats the epoch minute", () => {
    expect(formatMinuteUtc(0)).toBe("1970-01-01 00:00 UTC")
    expect(minuteId(0)).toBe("19700101-0000")
  })

  it("groups edition digits with spaces", () => {
    expect(formatEdition(29807862)).toBe("29 807 862")
    expect(formatEdition(12)).toBe("12")
  })

  it("measures progress within a minute", () => {
    const minute = minuteIndexAt(new Date("2026-09-03T21:42:00Z"))
    expect(minuteProgress(minute, new Date("2026-09-03T21:42:30Z"))).toBeCloseTo(0.5)
    expect(minuteProgress(minute, new Date("2026-09-03T21:41:00Z"))).toBe(0)
    expect(minuteProgress(minute, new Date("2026-09-03T21:44:00Z"))).toBe(1)
  })

  it("finds the first minute of a utc day", () => {
    const start = dayStartMinute(new Date("2026-09-03T21:42:00Z"))
    expect(minuteId(start)).toBe("20260903-0000")
  })
})
