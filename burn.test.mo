import L "mo:devefi-icrc-ledger";
import L2 "mo:devefi-icp-ledger";
import LC "mo:devefi-icrc-ledger/icrc_ledger";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import I "mo:itertools/Iter";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Debug "mo:base/Debug";
import Result "mo:base/Result";
import Vector "mo:vector";
import IC "./services/ic";
import Cycles "mo:base/ExperimentalCycles";

actor class({ledgerId: Principal; ledger_type:{#icrc;#icp}}) = this {

    type R<A,B> = Result.Result<A,B>;
    private transient let ic : IC.Self = actor ("aaaaa-aa");


    stable let lmem = L.Mem.Ledger.V2.new();
    stable let lmem_icp = L2.Mem.Ledger.V2.new();


    transient let ledger = switch(ledger_type) {
        case (#icrc) L.Ledger<system>(lmem, {
            LEDGER_ID = ledgerId;
            ME_CAN = Principal.fromActor(this);
            START_FROM_BLOCK = #id(0);
            CYCLE_RECURRING_TIME_SEC = 2;
        });
        case (#icp) L2.Ledger<system>(lmem_icp, {
            LEDGER_ID = ledgerId;
            ME_CAN = Principal.fromActor(this);
            START_FROM_BLOCK = #id(0);
            CYCLE_RECURRING_TIME_SEC = 2;
        });
    };

    transient var sent_txs = Vector.new<(Nat64,Nat)>();
    ledger.onSent(func(idx, block_id) {
        Vector.add(sent_txs, (idx, block_id));
    });

    public shared func send_to(to: LC.Account, amount: Nat) : async R<Nat64, L.SendError> {
        ledger.send({ to = #icrc(to); amount; from_subaccount = null; memo = null; });
    };


    public shared func send_to_icp(to: Blob, amount: Nat) : async R<Nat64, L2.SendError> {
        ledger.send({ to = #icp(to); amount; from_subaccount = null; memo = null; });
    };

    public shared func send_to_with_memo(to: LC.Account, amount: Nat, memo: ?Blob) : async R<Nat64, L.SendError> {
        ledger.send({ to = #icrc(to); amount; from_subaccount = null; memo = memo; });
    };

    //---
    public query func get_pending_transactions() : async [L.TransactionShared] {
        ledger.getPendingTransactions();
    };

    public shared func clear_pending_transactions() : async () {
        ledger.sender.clearPendingTransactions();
    };

    public shared func simulate_cycle_outage_while_sending(can:Principal, to:LC.Account) : async () {
        let burn_amount = Cycles.balance() - 500_000_000_000;
        await (with cycles = burn_amount) ic.deposit_cycles({ canister_id = can });
        try {
        var i =0;
        while (i < 100) {
            ignore ledger.send({ to = #icrc(to); amount = 100_000; from_subaccount = null; memo = null; });
            await (with cycles = 5_000_000_000) ic.deposit_cycles({ canister_id = can });
            i += 1;
        }
        } catch (_e) {
            Debug.print("Burning complete");
        }
    };

    public query func get_balance(s: ?Blob) : async Nat {
        ledger.balance(s)
        };

    public query func get_errors() : async [Text] {
        ledger.getErrors();
        };

    public query func get_info() : async L.Info {
        ledger.getInfo();
        };

    public query func accounts() : async [(Blob, Nat)] {
        Iter.toArray(ledger.accounts());
        };

    public query func getPending() : async Nat {
        ledger.getSender().getPendingCount();
        };
    
    public query func ver() : async Nat {
        4
        };
    
    public query func getMeta() : async L.Mem.Ledger.V1.Meta {
        ledger.getMeta()
        };

    public query func getSentTxs() : async [(Nat64, Nat)] {
        Vector.toArray(sent_txs);
    };
}