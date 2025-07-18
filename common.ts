import { Principal } from '@dfinity/principal';
import { resolve } from 'node:path';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';
import { _SERVICE as BasicService, idlFactory as BasicIdlFactory, init as basicInit } from './build/basic.idl.js';
import { _SERVICE as BurnService, idlFactory as BurnIdlFactory, init as burnInit } from './build/burn.idl.js';
import { _SERVICE as FastscanService, idlFactory as FastscanIdlFactory, init as fastscanInit } from './build/fastscan.idl.js';
import { _SERVICE as PassbackService, idlFactory as PassbackIdlFactory, init as passbackInit } from './build/passback.idl.js';
import { _SERVICE as ICRCLedgerService, idlFactory as ICRCLedgerIdlFactory, init as icrcInit, LedgerArg as ICRCLedgerArg } from './icrc_ledger/ledger.idl.js';
//@ts-ignore
import {toState} from "@infu/icblast";
// Jest can't handle multi threaded BigInts o.O That's why we use toState

export const BASIC_WASM_PATH = resolve(__dirname, "./build/basic.wasm");
export const BURN_WASM_PATH = resolve(__dirname, "./build/burn.wasm");
export const FASTSCAN_WASM_PATH = resolve(__dirname, "./build/fastscan.wasm");
export const PASSBACK_WASM_PATH = resolve(__dirname, "./build/passback.wasm");

export const LEDGER_TYPE = process.env['LEDGER_TYPE'] as "icrc" | "icp";

export {toState};

export async function CanBasic(pic:PocketIc, ledgerCanisterId:Principal) {
    
    const fixture = await pic.setupCanister<BasicService>({
        idlFactory: BasicIdlFactory,
        wasm: BASIC_WASM_PATH,
        arg: IDL.encode(basicInit({ IDL }), [{ledgerId: ledgerCanisterId, ledger_type: {[LEDGER_TYPE]:null}}]),
    });

    return fixture;
};
export {BasicService, BasicIdlFactory, basicInit};

export async function CanBurn(pic:PocketIc, ledgerCanisterId:Principal, specific_canister_id:Principal | undefined) {
    
    const fixture = await pic.setupCanister<BurnService>({
        ...specific_canister_id?{targetCanisterId: specific_canister_id}:{},
        idlFactory: BurnIdlFactory,
        wasm: BURN_WASM_PATH,
        arg: IDL.encode(burnInit({ IDL }), [{ledgerId: ledgerCanisterId, ledger_type: {[LEDGER_TYPE]:null}}]),
    });

    return fixture;
};
export {BurnService, BurnIdlFactory, burnInit};

export async function CanFastscan(pic:PocketIc, ledgerCanisterId:Principal) {
    
    const fixture = await pic.setupCanister<FastscanService>({
        idlFactory: FastscanIdlFactory,
        wasm: FASTSCAN_WASM_PATH,
        arg: IDL.encode(fastscanInit({ IDL }), [{ledgerId: ledgerCanisterId, ledger_type: {[LEDGER_TYPE]:null}}]),
    });

    return fixture;
};
export {FastscanService, FastscanIdlFactory, fastscanInit};


export async function CanPassback(pic:PocketIc, ledgerCanisterId:Principal) {
    
    const fixture = await pic.setupCanister<PassbackService>({
        idlFactory: PassbackIdlFactory,
        wasm: PASSBACK_WASM_PATH,
        arg: IDL.encode(passbackInit({ IDL }), [{ledgerId: ledgerCanisterId, ledger_type: {[LEDGER_TYPE]:null}}]),
    });

    return fixture;
};  

export {PassbackService, PassbackIdlFactory, passbackInit};   



let ICRC_WASM_PATH = resolve(__dirname, "./icrc_ledger/ledger.wasm");
if (process.env['LEDGER'] === "motoko") {
    console.log("🚀🦀 USING MOTOKO LEDGER - BRACE FOR IMPACT! 💥🦑");
    ICRC_WASM_PATH = resolve(__dirname, "./icrc_ledger/motoko_ledger.wasm");
}

function get_args(me:Principal) {
    let ledger_args:ICRCLedgerArg = {
        Init: {
            minting_account: {
                owner: me,
                subaccount: []
            },
            fee_collector_account: [], //{ owner: me, subaccount:[] }
            transfer_fee: 10000n,
            decimals: [8],
            token_symbol: "tCOIN",
            token_name: "Test Coin",
            metadata: [],
            initial_balances: [], //[{ owner: me, subaccount:[] }, 100000000000n]
            archive_options: {
                num_blocks_to_archive: 1000n,
                trigger_threshold: 3000n,
                controller_id: me,
                max_transactions_per_response: [],
                max_message_size_bytes: [],
                cycles_for_archive_creation: [1000_000_000_000n],
                node_max_memory_size_bytes: [],
            },
            maximum_number_of_accounts: [],
            accounts_overflow_trim_quantity: [],
            max_memo_length: [],
            feature_flags: [{ icrc2: true }],            
        },
    };


    return ledger_args;
    }

export async function ICRCLedger(pic: PocketIc, me:Principal, subnet:Principal | undefined) {

    const fixture = await pic.setupCanister<ICRCLedgerService>({
        idlFactory: ICRCLedgerIdlFactory,
        wasm: ICRC_WASM_PATH,
        arg: IDL.encode(icrcInit({IDL}), [get_args(me)]),
        ...subnet?{targetSubnetId: subnet}:{},
    });

    await pic.addCycles(fixture.canisterId, 100_000_000_000_000_000);   
    return fixture;
};


export async function ICRCLedgerUpgrade(pic: PocketIc, me:Principal, canister_id:Principal, subnet:Principal | undefined) {
    await pic.upgradeCanister({ canisterId: canister_id, wasm: ICRC_WASM_PATH, arg: IDL.encode(icrcInit({ IDL }), [{Upgrade: []}]) });

}

export { ICRCLedgerService, ICRCLedgerIdlFactory, icrcInit };