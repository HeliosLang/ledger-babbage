import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { StakingAddress } from "./StakingAddress.js"

describe(StakingAddress.name, () => {
    it("StakingAddress.dummy() returns all 0s for default arg", () => {
        deepEqual(
            StakingAddress.dummy(false).stakingHash.bytes,
            new Array(28).fill(0)
        )
    })

    it("StakingAddress.dummy() doesn't return all 0s for non-zero seed arg", () => {
        throws(() => {
            deepEqual(
                StakingAddress.dummy(false, 1).stakingHash.bytes,
                new Array(28).fill(0)
            )
        })
    })
})
