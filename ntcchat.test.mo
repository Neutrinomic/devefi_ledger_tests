import Vector "mo:vector";
import Cycles "mo:base/ExperimentalCycles";

persistent actor {
    type Account = { owner: Principal; subaccount: ?Blob };

    let chat = Vector.new<(Account, Blob, Nat)>();

    public func ntc(from: Account, payload: Blob) : async () {
        // In production check if caller is ntc minter canister
        let cycles = Cycles.accept<system>(Cycles.available());
        Vector.add(chat, (from, payload, cycles));
    };

    public query func get_chat() : async [(Account, Blob, Nat)] {
        Vector.toArray(chat);
    };
}