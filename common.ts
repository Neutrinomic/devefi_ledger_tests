import { Principal } from '@dfinity/principal';
import { resolve } from 'node:path';
import { Actor, PocketIc, createIdentity} from '@dfinity/pic';
import { IDL } from '@dfinity/candid';
import { _SERVICE as BasicService, idlFactory as BasicIdlFactory, init as basicInit } from './build/basic.idl.js';
import { _SERVICE as BurnService, idlFactory as BurnIdlFactory, init as burnInit } from './build/burn.idl.js';
import { _SERVICE as FastscanService, idlFactory as FastscanIdlFactory, init as fastscanInit } from './build/fastscan.idl.js';
import { _SERVICE as PassbackService, idlFactory as PassbackIdlFactory, init as passbackInit } from './build/passback.idl.js';
import { _SERVICE as ICRCLedgerService, idlFactory as ICRCLedgerIdlFactory, init as icrcInit, LedgerArg as ICRCLedgerArg, GetTransactionsRequest, GetTransactionsResponse, Transaction as ICRCTransaction, Account } from './icrc_ledger/ledger.idl.js';
import { _SERVICE as ICPLedgerService, idlFactory as ICPLedgerIdlFactory, init as icpInit, LedgerCanisterPayload as ICPLedgerCanisterPayload, QueryBlocksResponse, Block as ICPBlock, Transaction as ICPTransaction } from './icp_ledger/ledger.idl';
import { _SERVICE as CycleWalletService, idlFactory as CycleWalletIdlFactory, init as cycleWalletInit } from './build/cycle_wallet.idl.js';
import { _SERVICE as NTCService, idlFactory as NTCIdlFactory, init as ntcInit } from './build/NTC.idl.js';
import { _SERVICE as NTCCHAT_SERVICE, idlFactory as NTCCHAT_IDL_FACTORY, init as ntcchat_init } from './build/ntcchat.idl.js';

//@ts-ignore
import {toState} from "@infu/icblast";
import { AccountIdentifier, SubAccount } from '@dfinity/ledger-icp';
// Jest can't handle multi threaded BigInts o.O That's why we use toState

export const BASIC_WASM_PATH = resolve(__dirname, "./build/basic.wasm");
export const BURN_WASM_PATH = resolve(__dirname, "./build/burn.wasm");
export const FASTSCAN_WASM_PATH = resolve(__dirname, "./build/fastscan.wasm");
export const PASSBACK_WASM_PATH = resolve(__dirname, "./build/passback.wasm");
export const NTC_WASM_PATH = resolve(__dirname, "./build/NTC.wasm");
export const CYCLE_WALLET_WASM_PATH = resolve(__dirname, "./build/cycle_wallet.wasm");
export const NTCCHAT_WASM_PATH = resolve(__dirname, "./build/ntcchat.wasm");
export const LEDGER_TYPE = process.env['LEDGER_TYPE'] as "icrc" | "icp";

export {toState};

export async function CanNTCCHAT(pic:PocketIc) {
    const fixture = await pic.setupCanister<NTCCHAT_SERVICE>({
        idlFactory: NTCCHAT_IDL_FACTORY,
        wasm: NTCCHAT_WASM_PATH,
        arg: IDL.encode(ntcchat_init({ IDL }), []),
    });

    return fixture;
}



export {NTCCHAT_SERVICE, NTCCHAT_IDL_FACTORY, ntcchat_init};

export async function CanNTC(pic:PocketIc, targetCanisterId:Principal, ledgerCanisterId:Principal) {
    const fixture = await pic.setupCanister<NTCService>({
        targetCanisterId,
        idlFactory: NTCIdlFactory,
        wasm: NTC_WASM_PATH,
        arg: IDL.encode(ntcInit({ IDL }), [{ledgerId: ledgerCanisterId}]),
    });

    return fixture;
};

export {NTCService, NTCIdlFactory, ntcInit};

export async function CanCycleWallet(pic:PocketIc) {
    const fixture = await pic.setupCanister<CycleWalletService>({
        idlFactory: CycleWalletIdlFactory,
        wasm: CYCLE_WALLET_WASM_PATH,
        arg: IDL.encode(cycleWalletInit({ IDL }), []),
    });

    return fixture;
};

export {CycleWalletService, CycleWalletIdlFactory, cycleWalletInit};


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

let ICP_WASM_PATH = resolve(__dirname, "./icp_ledger/ledger.wasm");

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
            max_memo_length: [80],
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
    
    return {
        canisterId: fixture.canisterId,
        actor: fixture.actor as Actor<ICRCLedgerService>
    };
};


export async function ICRCLedgerUpgrade(pic: PocketIc, me:Principal, canister_id:Principal, subnet:Principal | undefined) {
    await pic.upgradeCanister({ canisterId: canister_id, wasm: ICRC_WASM_PATH, arg: IDL.encode(icrcInit({ IDL }), [{Upgrade: []}]) });

}

export { ICRCLedgerService, ICRCLedgerIdlFactory, icrcInit };

// Helper function to convert ICP Block to ICRC Transaction
function convertICPBlockToICRCTransaction(block: ICPBlock): ICRCTransaction {
    const icpTx = block.transaction;
    
    // Initialize ICRC transaction with common fields
    const icrcTx: ICRCTransaction = {
        burn: [],
        kind: "",
        mint: [],
        approve: [],
        timestamp: block.timestamp.timestamp_nanos,
        transfer: []
    };

    // Convert operation to appropriate ICRC transaction type
    if (icpTx.operation && icpTx.operation.length > 0) {
        const operation = icpTx.operation[0];
        
        if ('Mint' in operation) {
            icrcTx.kind = "mint";
            icrcTx.mint = [{
                to: getAccountFromMap(operation.Mint.to),
                memo: icpTx.icrc1_memo,
                created_at_time: [icpTx.created_at_time.timestamp_nanos],
                amount: BigInt(operation.Mint.amount.e8s)
            }];
        } else if ('Burn' in operation) {
            icrcTx.kind = "burn";
            icrcTx.burn = [{
                from: getAccountFromMap(operation.Burn.from),
                memo: icpTx.icrc1_memo,
                created_at_time: [icpTx.created_at_time.timestamp_nanos],
                amount: BigInt(operation.Burn.amount.e8s),
                spender: operation.Burn.spender ? [getAccountFromMap(operation.Burn.spender[0])] : []
            }];
        } else if ('Transfer' in operation) {
            icrcTx.kind = "transfer";
            icrcTx.transfer = [{
                to: getAccountFromMap(operation.Transfer.to),
                fee: [BigInt(operation.Transfer.fee.e8s)],
                from: getAccountFromMap(operation.Transfer.from),
                memo: icpTx.icrc1_memo,
                created_at_time: [icpTx.created_at_time.timestamp_nanos],
                amount: BigInt(operation.Transfer.amount.e8s),
                spender: operation.Transfer.spender ? [getAccountFromMap(operation.Transfer.spender[0])] : []
            }];
        } else if ('Approve' in operation) {
            icrcTx.kind = "approve";
            icrcTx.approve = [{
                fee: [BigInt(operation.Approve.fee.e8s)],
                from: getAccountFromMap(operation.Approve.from),
                memo: icpTx.icrc1_memo,
                created_at_time: [icpTx.created_at_time.timestamp_nanos],
                amount: BigInt(operation.Approve.allowance.e8s),
                expected_allowance: operation.Approve.expected_allowance ? [BigInt(operation.Approve.expected_allowance[0].e8s)] : [],
                expires_at: operation.Approve.expires_at ? [operation.Approve.expires_at[0].timestamp_nanos] : [],
                spender: getAccountFromMap(operation.Approve.spender)
            }];
        }
    }

    return icrcTx;
}

let registered_accounts = new Map<string, Account>();

export function account2aid(account: Account) {
    return AccountIdentifier.fromPrincipal({
        principal: account.owner,
        subAccount: account.subaccount.length > 0 ? SubAccount.fromBytes(new Uint8Array(account.subaccount[0])) : undefined 
    });
}

// Function to register account mappings - calculates AccountIdentifier from Account
export function registerAccount(account: Account) {
    const accountIdentifier = account.subaccount.length > 0 
        ? AccountIdentifier.fromPrincipal({
            principal: account.owner,
            subAccount: SubAccount.fromBytes(new Uint8Array(account.subaccount[0]))
        })
        : AccountIdentifier.fromPrincipal({
            principal: account.owner
        });
    const key = accountIdentifier.toHex();
    registered_accounts.set(key, account);
}

// Helper function to convert AccountIdentifier to map key
function accountIdentifierToKey(accountIdentifier: Uint8Array | number[] | undefined): string | null {
    if (!accountIdentifier) {
        return null;
    }
    if (accountIdentifier instanceof Uint8Array) {
        return Buffer.from(accountIdentifier).toString('hex');
    } else {
        return Buffer.from(accountIdentifier).toString('hex');
    }
}

// Helper function to get account from map or return default
function getAccountFromMap(accountIdentifier: Uint8Array | number[] | undefined): Account {
    if (!accountIdentifier) {
        return { owner: Principal.anonymous(), subaccount: [] };
    }
    const key = accountIdentifierToKey(accountIdentifier);
    if (!key) {
        return { owner: Principal.anonymous(), subaccount: [] };
    }
    return registered_accounts.get(key) || { owner: Principal.anonymous(), subaccount: [] };
}

export async function realICPLedger(pic: PocketIc, can_id:Principal) {
    const actor = pic.createActor<ICPLedgerService>(ICPLedgerIdlFactory, can_id);
    return actor;
};

export async function ICPLedger(pic: PocketIc, me:Principal, subnet:Principal | undefined) {
    let me_address = AccountIdentifier.fromPrincipal({
        principal: me,
      }).toHex();
      
    let ledger_args:ICPLedgerCanisterPayload = {
        Init: {
            'send_whitelist' : [],
            'token_symbol' : ["tCOIN"],
            'transfer_fee' :[{e8s: 10000n}],
            'minting_account' : me_address,
            'maximum_number_of_accounts' : [],
            'accounts_overflow_trim_quantity' : [],
            'transaction_window' : [],
            'max_message_size_bytes' : [],
            'icrc1_minting_account' : [{owner: me, subaccount: []}],
            'archive_options' : [],
            'initial_values' : [],
            'token_name' : ["Test Coin"],
            'feature_flags' : [],
        },
    };

    const fixture = await pic.setupCanister<ICPLedgerService>({
        idlFactory: ICPLedgerIdlFactory,
        wasm: ICP_WASM_PATH,
        arg: IDL.encode(icpInit({IDL}), [ledger_args]),
        ...subnet?{targetSubnetId: subnet}:{},
    });

    await pic.addCycles(fixture.canisterId, 100_000_000_000_000_000);   

    // Create a proxy that has ICRCLedgerService interface but forwards to ICP ledger
    const proxyActor = new Proxy(fixture.actor, {
        get(target, prop) {
            // If the property exists on the target, return it
            if (prop in target) {
                return target[prop as keyof typeof target];
            }
            
            // Handle custom methods
            if (prop === 'get_transactions') {
                return async function(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
                    let resp: QueryBlocksResponse = await fixture.actor.query_blocks({start: request.start, length: request.length});

                    // Convert ICP blocks to ICRC transactions
                    const transactions: ICRCTransaction[] = resp.blocks.map((block: ICPBlock) => {
                        return convertICPBlockToICRCTransaction(block);
                    });

                    // Convert archived blocks to archived transactions
                    const archived_transactions = resp.archived_blocks.map(archived => ({
                        start: archived.start,
                        length: archived.length,
                        callback: archived.callback as any // Type conversion for compatibility
                    }));

                    return {
                        first_index: resp.first_block_index,
                        log_length: resp.chain_length,
                        transactions: transactions,
                        archived_transactions: archived_transactions
                    };
                };
            }
            
            // For any other missing method, return undefined or throw an error
            return undefined;
        }
    }) as unknown as Actor<ICRCLedgerService>;
    
    return {
        canisterId: fixture.canisterId,
        actor: proxyActor
    };
};


export { ICPLedgerService, ICPLedgerIdlFactory, icpInit };

export async function Ledger(pic: PocketIc, me:Principal) {
    if (LEDGER_TYPE === "icrc") {
        return await ICRCLedger(pic, me, undefined);
    } else if (LEDGER_TYPE === "icp") {
        return await ICPLedger(pic, me, undefined);
    }
}

export async function LedgerUpgrade(pic: PocketIc, me:Principal, canister_id:Principal) {
    if (LEDGER_TYPE === "icrc") {
        return await ICRCLedgerUpgrade(pic, me, canister_id, undefined);
    } else if (LEDGER_TYPE === "icp") {
        
    }
}

// export type LedgerService = typeof LEDGER_TYPE extends "icrc"
//   ? ICRCLedgerService
//   : ICPLedgerService;

// export type LedgerIdlFactory = typeof LEDGER_TYPE extends "icrc"
//   ? typeof ICRCLedgerIdlFactory
//   : typeof ICPLedgerIdlFactory;


export type LedgerService = ICRCLedgerService;

