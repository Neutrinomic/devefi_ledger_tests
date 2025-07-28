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


persistent actor class({ledgerId: Principal; ledger_type:{#icrc;#icp}}) = this {



    stable let lmem = L.Mem.Ledger.V1.new();
    stable let lmem_icp = L2.Mem.Ledger.V2.new();


    transient let ledger = switch(ledger_type) {
        case (#icrc) L.Ledger<system>(lmem, Principal.toText(ledgerId), #id(0), Principal.fromActor(this));
        case (#icp) L2.Ledger<system>(lmem_icp, Principal.toText(ledgerId), #id(0), Principal.fromActor(this));
    };
    
    ledger.onReceive(func <system>(t:L.Transfer) :() {
        
        ignore ledger.send({ to = t.from; amount = t.amount; from_subaccount = t.to.subaccount; memo = null; });
    });

    //---

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