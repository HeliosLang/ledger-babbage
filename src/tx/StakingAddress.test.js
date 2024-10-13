import { deepEqual, throws } from "node:assert"
import { describe, it } from "node:test"
import { dummyBytes } from "@helios-lang/codec-utils"
import { PubKeyHash, StakingValidatorHash } from "../hashes/index.js"
import { StakingAddress, makeStakingAddress } from "./StakingAddress.js"

/**
 * @template [Context=unknown]
 * @typedef {import("./StakingAddress.js").StakingAddressI<Context>} StakingAddressI
 */

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

describe(makeStakingAddress.name, () => {
    it("unknown context type for plain bytes", () => {
        /**
         * @satisfies {StakingAddressI<null>}
         */
        const _addr = makeStakingAddress({ bytes: dummyBytes(29) })
    })

    it("null context type for plain bytes and explicit null context", () => {
        /**
         * @satisfies {StakingAddressI<null>}
         */
        const _addr = makeStakingAddress({
            bytes: dummyBytes(29),
            context: null
        })
    })

    it("null context type for PubKeyHash bytes", () => {
        /**
         * @satisfies {StakingAddressI<null>}
         */
        const _addr = makeStakingAddress({
            hash: PubKeyHash.dummy(0),
            isMainnet: false
        })
    })

    it("known context for StakingValidatorHash with context", () => {
        /**
         * @satisfies {StakingAddressI<"hello world">}
         */
        const _addr = makeStakingAddress({
            hash: new StakingValidatorHash(
                dummyBytes(28),
                /** @type {const} */ ("hello world")
            ),
            isMainnet: false
        })
    })

    it("dummy address has null context", () => {
        /**
         * @satisfies {StakingAddressI<null>}
         */
        const _addr = makeStakingAddress({ dummy: 0 })
    })
})
