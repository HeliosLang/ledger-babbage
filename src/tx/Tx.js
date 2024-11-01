import {
    decodeBool,
    decodeNullOption,
    decodeTuple,
    encodeBool,
    encodeDefList,
    encodeInt,
    encodeMap,
    encodeNullOption,
    encodeTuple
} from "@helios-lang/cbor"
import { bytesToHex, compareBytes } from "@helios-lang/codec-utils"
import { blake2b } from "@helios-lang/crypto"
import { None, isLeft } from "@helios-lang/type-utils"
import { ListData, UplcRuntimeError } from "@helios-lang/uplc"
import { Value } from "../money/index.js"
import { NetworkParamsHelper } from "../params/index.js"
import { Signature } from "./Signature.js"
import { StakingAddress } from "./StakingAddress.js"
import { TxBody } from "./TxBody.js"
import { TxId } from "./TxId.js"
import { TxInput } from "./TxInput.js"
import { TxMetadata } from "./TxMetadata.js"
import { TxOutputId } from "./TxOutputId.js"
import { TxRedeemer } from "./TxRedeemer.js"
import { TxWitnesses } from "./TxWitnesses.js"

/**
 * @typedef {import("@helios-lang/codec-utils").BytesLike} BytesLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("@helios-lang/uplc").UplcLoggingI} UplcLoggingI
 * @typedef {import("@helios-lang/uplc").UplcProgramV1I} UplcProgramV1I
 * @typedef {import("@helios-lang/uplc").UplcProgramV2I} UplcProgramV2I
 * @typedef {import("../params/index.js").NetworkParams} NetworkParams
 */

/**
 * Represents a Cardano transaction.  For transaction-building, see {@link TxBuilder} instead.
 */
export class Tx {
    /**
     * @readonly
     * @type {TxBody}
     */
    body

    /**
     * @readonly
     * @type {TxWitnesses}
     */
    witnesses

    /**
     * Access this through `isValid()` instead
     * @private
     * @type {boolean}
     */
    valid

    /**
     * @readonly
     * @type {Option<TxMetadata>}
     */
    metadata

    /**
     * Access this through `hasValidationError()`
     * @private
     * @type {Option<string> | false}
     */
    validationError

    /**
     * Creates a new transaction; use {@link TxBuilder} to build a transaction instead.
     * @remarks
     * Use {@link Tx.fromCbor} to deserialize a transaction.
     * @param {TxBody} body
     * @param {TxWitnesses} witnesses
     * @param {boolean} valid - false whilst some signatures are still missing
     * @param {Option<TxMetadata>} metadata
     */
    constructor(body, witnesses, valid, metadata = None) {
        this.body = body
        this.witnesses = witnesses
        this.valid = valid
        this.metadata = metadata
        this.validationError = None

        Object.defineProperty(this, "validationError", {
            enumerable: false,
            writable: true,
            configurable: false
        })
    }

    /**
     * Deserialize a CBOR encoded Cardano transaction (input is either an array of bytes, or a hex string).
     * @param {BytesLike} bytes
     * @returns {Tx}
     */
    static fromCbor(bytes) {
        const [body, witnesses, valid, metadata] = decodeTuple(bytes, [
            TxBody,
            TxWitnesses,
            decodeBool,
            (s) => decodeNullOption(s, TxMetadata)
        ])

        return new Tx(body, witnesses, valid, metadata)
    }

    /**
     * Number of bytes of CBOR encoding of Tx
     *
     * Is used for two things:
     *   - tx fee calculation
     *   - tx size validation
     *
     * @param {boolean} forFeeCalculation - see comment in `this.toCbor()`
     * @returns {number}
     */
    calcSize(forFeeCalculation = false) {
        // add dummy signatures to make sure the tx has the correct size
        let nDummy = 0

        if (forFeeCalculation) {
            nDummy = this.countMissingSignatures()
            this.witnesses.addDummySignatures(nDummy)
        }

        const s = this.toCbor(forFeeCalculation).length

        if (forFeeCalculation) {
            this.witnesses.removeDummySignatures(nDummy)
        }

        return s
    }

    /**
     * Adds a signature created by a wallet. Only available after the transaction has been finalized.
     * Optionally verifies that the signature is correct.
     * @param {Signature} signature
     * @param {boolean} verify Defaults to `true`
     * @returns {Tx}
     */
    addSignature(signature, verify = true) {
        if (!this.valid) {
            throw new Error("invalid Tx")
        }

        if (verify) {
            signature.verify(this.id().bytes)
        }

        this.witnesses.addSignature(signature)

        return this
    }

    /**
     * Adds multiple signatures at once. Only available after the transaction has been finalized.
     * Optionally verifies each signature is correct.
     * @param {Signature[]} signatures
     * @param {boolean} verify
     * @returns {Tx}
     */
    addSignatures(signatures, verify = true) {
        for (let s of signatures) {
            this.addSignature(s, verify)
        }

        return this
    }

    /**
     * @param {NetworkParams} params
     * @param {boolean} recalcMinBaseFee
     * @returns {bigint} - a quantity of lovelace
     */
    calcMinCollateral(params, recalcMinBaseFee = false) {
        const fee = recalcMinBaseFee ? this.calcMinFee(params) : this.body.fee

        const helper = new NetworkParamsHelper(params)

        // integer division that rounds up
        const minCollateral =
            (fee * BigInt(helper.minCollateralPct) + 100n) / 100n

        return minCollateral
    }

    /**
     * @param {NetworkParams} params
     * @returns {bigint} - a quantity of lovelace
     */
    calcMinFee(params) {
        const helper = new NetworkParamsHelper(params)

        const [a, b] = helper.txFeeParams

        const sizeFee = BigInt(a) + BigInt(this.calcSize(true)) * BigInt(b)

        const exFee = this.witnesses.calcExFee(params)

        return sizeFee + exFee
    }

    /**
     * Creates a new Tx without the metadata for client-side signing where the client can't know the metadata before tx-submission.
     * @returns {Tx}
     */
    clearMetadata() {
        return new Tx(this.body, this.witnesses, this.valid, None)
    }

    /**
     * @returns {Object}
     */
    dump() {
        return {
            body: this.body.dump(),
            witnesses: this.witnesses.dump(),
            metadata: this.metadata ? this.metadata.dump() : null,
            id: this.id().toString(),
            size: this.calcSize()
        }
    }

    /**
     * @returns {TxId}
     */
    id() {
        return new TxId(this.body.hash())
    }

    /**
     * @returns {boolean}
     */
    isSmart() {
        return this.witnesses.isSmart()
    }

    /**
     * indicates if the necessary signatures are present and valid
     * @returns {boolean}
     */
    isValid() {
        return this.valid
    }

    /**
     * Indicates if a built transaction has passed all consistency checks.
     * @remarks
     * - `null` if the transaction hasn't been validated yet
     * - `false` when the transaction is valid
     * - a `string` with the error message if any validation check failed
     * @returns {Option<string> | false}
     */
    get hasValidationError() {
        return this.validationError
    }

    /**
     * Used by emulator to check if tx is valid.
     * @param {bigint} slot
     * @returns {boolean}
     */
    isValidSlot(slot) {
        return this.body.isValidSlot(slot)
    }

    /**
     * Restores input information after deserializing a CBOR-encoded transaction
     * @remarks
     * A serialized tx throws away input information
     * This must be refetched from the network if the tx needs to be analyzed
     * @param {{getUtxo(id: TxOutputId): Promise<TxInput>}} network - the TxInput returned by the network must itself be fully recovered
     */
    async recover(network) {
        await this.body.recover(network)

        const refScriptsInRefInputs = this.body.refInputs.reduce(
            (refScripts, input) => {
                const refScript = input.output.refScript

                if (refScript) {
                    return refScripts.concat([refScript])
                } else {
                    return refScripts
                }
            },
            /** @type {(UplcProgramV1I | UplcProgramV2I)[]} */ ([])
        )

        this.witnesses.recover(refScriptsInRefInputs)
    }

    /**
     * Serialize a transaction.
     *
     * Note: Babbage still follows Alonzo for the Tx size fee.
     *   According to https://github.com/IntersectMBO/cardano-ledger/blob/cardano-ledger-spec-2023-04-03/eras/alonzo/impl/src/Cardano/Ledger/Alonzo/Tx.hs#L316,
     *   the `isValid` field is omitted when calculating the size of the tx for fee calculation. This is to stay compatible with Mary (?why though, the txFeeFixed could've been changed instead?)
     *
     * @param {boolean} forFeeCalculation - set this to true if you want to calculate the size needed for the Tx fee, another great little Cardano quirk, pffff.
     * @returns {number[]}
     */
    toCbor(forFeeCalculation = false) {
        if (forFeeCalculation) {
            return encodeTuple([
                this.body.toCbor(),
                this.witnesses.toCbor(),
                encodeNullOption(this.metadata)
            ])
        } else {
            return encodeTuple([
                this.body.toCbor(),
                this.witnesses.toCbor(),
                encodeBool(true),
                encodeNullOption(this.metadata)
            ])
        }
    }

    /**
     * Throws an error if the tx isn't valid
     *
     * Checks that are performed:
     *   * size of tx <= params.maxTxSize
     *   * body.fee >= calculated min fee
     *   * value is conserved (minus what is burned, plus what is minted)
     *   * enough collateral if smart
     *   * no collateral if not smart
     *   * all necessary scripts are attached
     *   * no redundant scripts are attached (only checked if strict=true)
     *   * each redeemer must have enough ex budget
     *   * total ex budget can't exceed max tx ex budget for either mem or cpu
     *   * each output contains enough lovelace (minDeposit)
     *   * the assets in the output values are correctly sorted (only checked if strict=true, because only needed by some wallets)
     *   * inputs are in the correct order
     *   * ref inputs are in the correct order
     *   * minted assets are in the correct order
     *   * staking withdrawals are in the correct order
     *   * metadatahash corresponds to metadata
     *   * metadatahash is null if there isn't any metadata
     *   * script data hash is correct
     *
     * Checks that aren't performed:
     *   * all necessary signatures are included (must done after tx has been signed)
     *   * validity time range, which can only be checked upon submission
     *
     * @param {NetworkParams} params
     * @param {Object} options
     * @param {boolean} [options.strict=false] - can be left as false for inspecting general transactions. The TxBuilder always uses strict=true.
     * @param {boolean} [options.verbose=false] - provides more details of transaction-budget usage when the transaction is close to the limit
     * @param {UplcLoggingI} [options.logOptions] - logging options for diagnostics
     */
    validate(params, options = {}) {
        const { strict = false, logOptions } = options
        this.validateSize(params)

        this.validateFee(params)

        this.validateConservation(params)

        this.validateCollateral(params)

        this.validateScriptsPresent(strict)

        this.validateRedeemersExBudget(params, logOptions)

        this.validateTotalExBudget(params, options)

        this.validateOutputs(params, strict)

        this.validateInputsOrder()

        this.validateRefInputsOrder()

        this.validateMintedOrder()

        this.validateWithdrawalsOrder()

        // TODO: validateDCertsOrder ??

        this.validateMetadata()

        this.validateScriptDataHash(params)

        // TODO: add the rule that the total refScripts size in the inputs and ref inputs can't exceed 204800
    }

    /**
     * Validates the transaction without throwing an error if it isn't valid
     * If the transaction doesn't validate, the tx's ${validationError} will be set
     * @param {NetworkParams} params
     * @param {Object} [options]
     * @param {boolean} [options.strict=false] - can be left as false for inspecting general transactions. The TxBuilder always uses strict=true.
     * @param {boolean} [options.verbose=false] - provides more details of transaction-budget usage when the transaction is close to the limit
     * @param {UplcLoggingI} [options.logOptions] - hooks for script logging during transaction execution
     * @returns {Tx}
     */
    validateUnsafe(params, options = {}) {
        try {
            this.validate(params, options)
            this.validationError = false
        } catch (e) {
            this.validationError = e.message
            console.error(
                "Error validating transaction: ",
                this.validationError
            )
        }
        return this
    }

    /**
     * Throws an error if all necessary signatures haven't yet been added
     * Separate from the other validation checks
     * If valid: this.valid is mutated to true
     */
    validateSignatures() {
        const signatures = this.witnesses.signatures

        const includedSigners = new Set(
            signatures.map((s) => s.pubKeyHash.toHex())
        )

        // check the signers
        this.body.signers.forEach((s) => {
            if (!includedSigners.has(s.toHex())) {
                throw new Error(`signature for signer ${s.toHex()} missing`)
            }
        })

        // check the input and the collateral utxos
        this.body.inputs.concat(this.body.collateral).forEach((utxo) => {
            const pkh = utxo.output.address.pubKeyHash
            if (pkh && !includedSigners.has(pkh.toHex())) {
                throw new Error(
                    `signature for input at ${utxo.output.address.toBech32()} missing`
                )
            }
        })

        this.valid = true
    }

    /**
     * @private
     * @returns {number}
     */
    countMissingSignatures() {
        return (
            this.body.countUniqueSigners() -
            this.witnesses.countNonDummySignatures()
        )
    }

    /**
     * Validates that the collateral is correct
     * @remarks
     * Throws an error if there isn't enough collateral,
     * or if too much collateral is returned.
     *
     * The net collateral must not be more than 5x the required
     * collateral, or an error is thrown.
     *
     * Also throws an error if the script doesn't require collateral, but
     * collateral was actually included.
     * @private
     * @param {NetworkParams} params
     */
    validateCollateral(params) {
        const helper = new NetworkParamsHelper(params)

        if (this.body.collateral.length > helper.maxCollateralInputs) {
            throw new Error("too many collateral inputs")
        }

        if (this.isSmart()) {
            const minCollateral = this.getMinCollateral(params, helper)

            let sum = new Value()

            for (let col of this.body.collateral) {
                if (!col.output) {
                    throw new Error(
                        "expected collateral TxInput.origOutput to be set"
                    )
                } else if (!col.output.value.assets.isZero()) {
                    throw new Error("collateral can only contain lovelace")
                } else {
                    sum = sum.add(col.output.value)
                }
            }

            if (sum.lovelace < minCollateral) {
                throw new Error("not enough collateral")
            }

            const included = sum.lovelace
            if (this.body.collateralReturn != null) {
                sum = sum.subtract(this.body.collateralReturn.value)

                const netCollateral = sum.lovelace
                const collateralDiff = netCollateral - minCollateral
                if (collateralDiff < 0) {
                    const returned = this.body.collateralReturn.value.lovelace
                    throw new Error(
                        `collateralReturn is ${0n - collateralDiff} lovelace is too high\n` +
                            ` ${included} collateral inputs; need ${minCollateral} minimum\n` +
                            `-${returned} collateral returned, so ${netCollateral} net collateral is too low`
                    )
                }
            }

            if (included > minCollateral * 5n) {
                console.error("Warning: way too much collateral")
            }
        } else {
            if (this.body.collateral.length != 0) {
                throw new Error("unnecessary collateral included")
            }
        }
    }

    /**
     * computes the collateral needed for the transaction
     * @param {NetworkParams} params
     * @param {NetworkParamsHelper} [helper]
     * @private
     * @returns {bigint}
     */
    getMinCollateral(params, helper = new NetworkParamsHelper(params)) {
        let minCollateralPct = helper.minCollateralPct

        // only use the exBudget
        const fee = this.body.fee

        const minCollateral = BigInt(
            Math.ceil((minCollateralPct * Number(fee)) / 100.0)
        )
        return minCollateral
    }

    /**
     * Validate that value is conserved, minus what is burned and plus what is minted
     * Throws an error if value isn't conserved
     * @private
     * @param {NetworkParams} params
     */
    validateConservation(params) {
        const helper = new NetworkParamsHelper(params)

        const stakeAddrDeposit = new Value(helper.stakeAddressDeposit)
        let v = new Value(0n)

        v = this.body.inputs.reduce((prev, inp) => inp.value.add(prev), v)
        v = this.body.dcerts.reduce((prev, dcert) => {
            // add released stakeAddrDeposit
            return dcert.isDeregister() ? prev.add(stakeAddrDeposit) : prev
        }, v)
        v = v.subtract(new Value(this.body.fee))
        v = v.add(new Value(0, this.body.minted))
        v = this.body.outputs.reduce((prev, out) => {
            return prev.subtract(out.value)
        }, v)
        v = this.body.dcerts.reduce((prev, dcert) => {
            // deduct locked stakeAddrDeposit
            return dcert.isRegister() ? prev.subtract(stakeAddrDeposit) : prev
        }, v)

        if (v.lovelace != 0n) {
            throw new Error(
                `tx not balanced, net lovelace not zero (${v.lovelace})`
            )
        }

        if (!v.assets.isZero()) {
            throw new Error("tx not balanced, net assets not zero")
        }
    }

    /**
     * Final check that fee is big enough
     * Throws an error if not
     * @private
     * @param {NetworkParams} params
     */
    validateFee(params) {
        const minFee = this.calcMinFee(params)

        if (minFee > this.body.fee) {
            throw new Error(
                `fee too small, expected at least ${minFee}, got ${this.body.fee}`
            )
        }
    }

    /**
     * Throws an error in the inputs aren't in the correct order
     * @private
     */
    validateInputsOrder() {
        this.body.inputs.forEach((input, i) => {
            if (i > 0) {
                const prev = this.body.inputs[i - 1]

                // can be less than -1 if utxoIds aren't consecutive
                if (TxInput.compare(prev, input) >= 0) {
                    throw new Error("inputs aren't sorted")
                }
            }
        })
    }

    /**
     * Throws an error if the metadatahash doesn't correspond, or if a tx without metadata has its metadatahash set
     * @private
     */
    validateMetadata() {
        const metadata = this.metadata

        if (metadata) {
            const h = metadata.hash()

            if (this.body.metadataHash) {
                if (compareBytes(h, this.body.metadataHash) != 0) {
                    throw new Error(
                        "metadataHash doesn't correspond with actual metadata"
                    )
                }
            } else {
                throw new Error(
                    "metadataHash not included in a Tx that has metadata"
                )
            }
        } else {
            if (this.body.metadataHash) {
                throw new Error(
                    "metadataHash included in a Tx that doesn't have any metadata"
                )
            }
        }
    }

    /**
     * Throws an error if the minted assets aren't in the correct order
     * @private
     */
    validateMintedOrder() {
        this.body.minted.assertSorted()
    }

    /**
     * Checks that each output contains enough lovelace,
     *   and that the contained assets are correctly sorted
     * @private
     * @param {NetworkParams} params
     * @param {boolean} strict
     */
    validateOutputs(params, strict) {
        this.body.outputs.forEach((output) => {
            const minLovelace = output.calcDeposit(params)

            if (minLovelace > output.value.lovelace) {
                throw new Error(
                    `not enough lovelace in output (expected at least ${minLovelace.toString()}, got ${output.value.lovelace})`
                )
            }

            if (strict) {
                output.value.assets.assertSorted()
            }
        })
    }

    /**
     * @private
     * @param {NetworkParams} params
     * @param {Option<UplcLoggingI>} logOptions
     */
    validateRedeemersExBudget(params, logOptions) {
        const txInfo = this.body.toTxInfo(
            params,
            this.witnesses.redeemers,
            this.witnesses.datums,
            this.id()
        )

        for (const redeemer of this.witnesses.redeemers) {
            logOptions?.reset?.("validate")
            const { description, summary, script, args } =
                redeemer.getRedeemerDetails(this, txInfo)

            // when the script is not optimized, the logs will come from here
            //!!! todo: this line doesn't catch errors if we e.g. include an extra 'undefined' arg.  WHY?
            const { cost, result } = script.eval(args, {
                logOptions: logOptions ?? undefined
            })
            /* @type { CekResult } */
            let altResult
            if (script.alt) {
                // this never happens if the main script has done logging!
                altResult = script.alt.eval(args, {
                    logOptions: logOptions ?? undefined
                }) // emit logs from non-optimized version
            }

            if (cost.mem > redeemer.cost.mem) {
                throw new Error(
                    `actual mem cost for ${summary} too high, expected at most ${redeemer.cost.mem}, got ${cost.mem}` +
                        `\n ... in ${description}` // @reviewers: WDYT?
                )
            }

            if (cost.cpu > redeemer.cost.cpu) {
                throw new Error(
                    `actual cpu cost for ${summary} too high, expected at most ${redeemer.cost.cpu}, got ${cost.cpu}` +
                        `\n ... in ${description}` // @reviewers: WDYT?
                )
            }

            if (isLeft(result)) {
                if (altResult && !isLeft(altResult.result)) {
                    console.warn(
                        ` - WARNING: optimized script for ${summary} failed, but unoptimized succeeded`
                    )
                    debugger
                } else {
                    console.warn(
                        `NOTE: no alt script attached for ${summary}; no script logs available.  See \`compile\` docs to enable it`
                    )

                    debugger
                }
                const errMsg =
                    result.left.error ||
                    logOptions?.lastMsg ||
                    (script.alt
                        ? `‹no alt= script for ${summary}, no logged errors›`
                        : "‹no logged errors›")
                logOptions?.logError?.(
                    errMsg,
                    result.left.callSites.slice().pop()?.site
                ) // XXX: it might be weird to log this error message AND throw an error containing the same

                throw new UplcRuntimeError(
                    `script validation error in ${summary}: ${errMsg}` +
                        `\n ... error in ${description}`, // TODO: should description and summary also be part of the UplcRuntimeError stack trace?
                    result.left.callSites
                )
            }
            logOptions?.flush?.()
        }
    }

    /**
     * Throws an error if the ref inputs aren't in the correct order
     * @private
     */
    validateRefInputsOrder() {
        // same for ref inputs
        this.body.refInputs.forEach((input, i) => {
            if (i > 0) {
                const prev = this.body.refInputs[i - 1]

                // can be less than -1 if utxoIds aren't consecutive
                if (TxInput.compare(prev, input) >= 0) {
                    throw new Error("refInputs not sorted")
                }
            }
        })
    }

    /**
     * Throws an error if the script data hash is incorrect
     * @private
     * @param {NetworkParams} params
     */
    validateScriptDataHash(params) {
        if (this.witnesses.redeemers.length > 0) {
            if (this.body.scriptDataHash) {
                const scriptDataHash = calcScriptDataHash(
                    params,
                    this.witnesses.datums,
                    this.witnesses.redeemers
                )

                if (
                    compareBytes(scriptDataHash, this.body.scriptDataHash) != 0
                ) {
                    throw new Error("wrong script data hash")
                }
            } else {
                throw new Error(
                    "no script data hash included for a Tx that has redeemers"
                )
            }
        } else {
            if (this.body.scriptDataHash) {
                throw new Error(
                    "script data hash included for a Tx that has no redeemers"
                )
            }
        }
    }

    /**
     * Checks that all necessary scripts and UplcPrograms are included, and that all included scripts are used
     * @private
     * @param {boolean} strict
     */
    validateScriptsPresent(strict) {
        const allScripts = this.witnesses.allScripts
        const includedScriptHashes = new Set(
            allScripts.map((s) => bytesToHex(s.hash()))
        )

        if (allScripts.length != includedScriptHashes.size) {
            throw new Error("duplicate scripts included in transaction")
        }

        const requiredScriptHashes = this.body.allScriptHashes

        if (requiredScriptHashes.length < includedScriptHashes.size) {
            throw new Error(
                `too many scripts included, not all are needed (${includedScriptHashes.size} included, but only ${requiredScriptHashes.length} required)`
            )
        }

        requiredScriptHashes.forEach((hash) => {
            const key = hash.toHex()

            if (!includedScriptHashes.has(key)) {
                throw new Error(`missing script for hash ${key}`)
            }
        })

        if (strict) {
            includedScriptHashes.forEach((key) => {
                if (
                    requiredScriptHashes.findIndex((h) => h.toHex() == key) ==
                    -1
                ) {
                    throw new Error(`detected unused script ${key}`)
                }
            })
        }
    }

    /**
     * Throws error if tx is too big
     * @private
     * @param {NetworkParams} params
     */
    validateSize(params) {
        const helper = new NetworkParamsHelper(params)

        if (this.calcSize() > helper.maxTxSize) {
            // TODO: should we also use the fee calculation size instead of the real size for this? (i.e. 1 byte difference)
            throw new Error("tx too big")
        }
    }

    /**
     * Throws error if execution budget is exceeded, with optional warnings and script-profile diagnostics
     * @private
     * @param {NetworkParams} params
     * @param {Object} options
     * @param {boolean} [options.verbose=false] - if true -> warn if ex budget >= 50% max budget
     * @param {boolean} [options.strict=true] - if false, over-budget in the presence of unoptimized scripts will only be a warning
     */
    validateTotalExBudget(params, options) {
        const verbose = options.verbose ?? false
        const strict = options.strict ?? true

        const helper = new NetworkParamsHelper(params)
        let totalMem = 0n
        let totalCpu = 0n

        let missingAltScripts = 0
        for (let redeemer of this.witnesses.redeemers) {
            totalMem += redeemer.cost.mem
            totalCpu += redeemer.cost.cpu

            const { script, description } = redeemer.getRedeemerDetails(this)
            if (!script.alt) {
                missingAltScripts += 1
                if (verbose) {
                    console.error(
                        ` - unoptimized? mem=${memPercent(redeemer.cost.mem)}% cpu=${cpuPercent(redeemer.cost.cpu)}% in ${description} `
                    )
                }
            }
        }

        let [maxMem, maxCpu] = helper.maxTxExecutionBudget

        if (totalMem > BigInt(maxMem)) {
            const problem = `tx execution budget exceeded for mem (${totalMem.toString()} = ${memPercent(totalMem)}% of ${maxMem.toString()})

            \n`
            if (missingAltScripts && !strict) {
                console.error(problem)
                console.error(
                    `Note: ${missingAltScripts} unoptimized(?) scripts`
                )
            } else {
                throw new Error(problem)
            }
        } else if (verbose && totalMem > BigInt(maxMem) / 2n) {
            console.error(
                `Warning: mem usage = ${memPercent(totalMem)}% of tx-max mem budget (${totalMem.toString()}/${maxMem.toString()} >= 50%)`
            )
        }

        if (totalCpu > BigInt(maxCpu)) {
            const problem = `tx execution budget exceeded for cpu (${totalCpu.toString()} > ${maxCpu.toString()})\n`
            if (missingAltScripts && !strict) {
                console.error(problem)
                console.error(
                    `Note: ${missingAltScripts} unoptimized(?) scripts`
                )
            } else {
                throw new Error(problem)
            }
        } else if (verbose && totalCpu > BigInt(maxCpu) / 2n) {
            console.error(
                `Warning: cpu usage = ${cpuPercent(totalCpu)}% of tx-max cpu budget (${totalCpu.toString()}/${maxCpu.toString()} >= 50%)`
            )
        }
        function memPercent(mem) {
            return (
                Math.floor(
                    Number(
                        (mem * 1000n) / BigInt(helper.maxTxExecutionBudget[0])
                    )
                ) / 10
            )
        }
        function cpuPercent(cpu) {
            return (
                Math.floor(
                    Number(
                        (cpu * 1000n) / BigInt(helper.maxTxExecutionBudget[1])
                    )
                ) / 10
            )
        }
    }

    /**
     * Throws an error if the withdrawals aren't in the correct order
     * @private
     */
    validateWithdrawalsOrder() {
        this.body.withdrawals.forEach((w, i) => {
            if (i > 0) {
                const prev = this.body.withdrawals[i - 1]

                if (StakingAddress.compare(prev[0], w[0]) >= 0) {
                    throw new Error("withdrawals not sorted")
                }
            }
        })
    }
}

/**
 * @param {NetworkParams} params
 * @param {UplcData[]} datums
 * @param {TxRedeemer[]} redeemers
 * @returns {number[]}
 */
export function calcScriptDataHash(params, datums, redeemers) {
    const helper = new NetworkParamsHelper(params)

    if (redeemers.length == 0) {
        throw new Error(
            "expected at least 1 redeemer to be able to create the script data hash"
        )
    }

    let bytes = encodeDefList(redeemers)

    if (datums.length > 0) {
        bytes = bytes.concat(new ListData(datums).toCbor())
    }

    // language view encodings?
    const costParams = helper.costModelParamsV2

    bytes = bytes.concat(
        encodeMap([
            [
                encodeInt(1),
                encodeDefList(costParams.map((cp) => encodeInt(BigInt(cp))))
            ]
        ])
    )

    return blake2b(bytes)
}
