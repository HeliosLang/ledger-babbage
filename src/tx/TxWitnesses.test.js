import { describe, it } from "node:test";
import { TxWitnesses } from "./TxWitnesses.js";

describe("TxWitnessed", () => {
    it("correctly deserializes CBOR", () => {
        TxWitnesses.fromCbor("a30081825820a0e006bbd52e9db2dcd904e90c335212d2968fcae92ee9dd01204543c314359b58409b4267e7691d160414f774f82942f08bbc3c64a19259a09b92350fe11ced5f73b64d99aa05f70cb68c730dc0d6ae718f739e5c2932eb843f2a9dcd69ff3c160c068147460100002249810581840100182a821903201a0002754c")
    })
})