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


actor class({ledgerId: Principal; ledger_type:{#icrc;#icp}}) = this {

    Debug.print("basic.test.mo");
    private func test_subaccount(n:Nat64) : ?Blob {
        ?Blob.fromArray(Iter.toArray(I.pad<Nat8>( Iter.fromArray(ENat64(n)), 32, 0 : Nat8)));
    };

    private func ENat64(value : Nat64) : [Nat8] {
        return [
            Nat8.fromNat(Nat64.toNat(value >> 56)),
            Nat8.fromNat(Nat64.toNat((value >> 48) & 255)),
            Nat8.fromNat(Nat64.toNat((value >> 40) & 255)),
            Nat8.fromNat(Nat64.toNat((value >> 32) & 255)),
            Nat8.fromNat(Nat64.toNat((value >> 24) & 255)),
            Nat8.fromNat(Nat64.toNat((value >> 16) & 255)),
            Nat8.fromNat(Nat64.toNat((value >> 8) & 255)),
            Nat8.fromNat(Nat64.toNat(value & 255)),
        ];
    };

    stable var next_subaccount_id:Nat64 = 100000;

    stable let lmem = L.Mem.Ledger.V1.new();
    stable let lmem_icp = L2.Mem.Ledger.V2.new();


    let ledger = switch(ledger_type) {
        case (#icrc) L.Ledger<system>(lmem, Principal.toText(ledgerId), #id(0), Principal.fromActor(this));
        case (#icp) L2.Ledger<system>(lmem_icp, Principal.toText(ledgerId), #id(0), Principal.fromActor(this));
    };


    ledger.onReceive(func (t) {

        if (t.to.subaccount == null) {
            // we will split into 1,000 subaccounts
            var i = 1;
            Debug.print("t.amount " # debug_show(t.amount));
            label sending loop {
                let amount = t.amount / 10000; // Each account gets 1/10000
                // Debug.print(">>>" # debug_show(amount));
                if (amount <= 10000) {
                    Debug.print("amount <= 10000");
                    break sending;
                };
                ignore ledger.send({ to = #icrc({owner=ledger.me(); subaccount=test_subaccount(Nat64.fromNat(i))}); amount; from_subaccount = t.to.subaccount; memo = null; });
                ledger.registerSubaccount(test_subaccount(Nat64.fromNat(i)));
                i += 1;
                if (i >= 1_001) break sending;
            }
        } else {
            // if it has subaccount
            // we will pass half to another subaccount
            if (t.amount/10 < ledger.getFee() ) return; // if we send that it will be removed from our balance but won't register
            // Debug.print(debug_show(t.amount/10));
            ignore ledger.send({ to = #icrc({owner=ledger.me(); subaccount=test_subaccount(next_subaccount_id)}); amount = t.amount / 10 ; from_subaccount = t.to.subaccount; memo = null; });
            ledger.registerSubaccount(test_subaccount(next_subaccount_id));
            next_subaccount_id += 1;
            
        }
    });
    
    //---

    public query func get_pending_transactions() : async [L.TransactionShared] {
        ledger.getPendingTransactions();
    };

    public shared func clear_pending_transactions() : async () {
        ledger.sender.clearPendingTransactions();
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
}