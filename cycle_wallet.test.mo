
import Result "mo:base/Result";
import IC "./services/ic";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";

actor class() = this {

    type R<A,B> = Result.Result<A,B>;
    private let ic : IC.Self = actor ("aaaaa-aa");

    public shared query func getCyclesBalance() : async Nat {
        return Cycles.balance();
    };

    let minter = actor ("7ew52-sqaaa-aaaal-qsrda-cai") : actor {
        mint : shared ({owner:Principal; subaccount:?Blob}) -> async ();
    };

    public shared func mint_ntc(amount: Nat, account: {owner:Principal; subaccount:?Blob}) : async () {
        let cycles = await getCyclesBalance();
        if (cycles < amount) Debug.trap("Not enough cycles");

        await (with cycles=amount) minter.mint(account);
    };


    public shared func burn_my_cycles(can:Principal) : async () {
        let burn_amount = Cycles.balance() - 500_000_000_000:Nat;
        await (with cycles = burn_amount) ic.deposit_cycles({ canister_id = can });
        try {
        var i =0;
        while (i < 100) {
            await (with cycles = 5_000_000_000) ic.deposit_cycles({ canister_id = can });
            i += 1;
        }
        } catch (_e) {
            Debug.print("Burning complete");
        }
    };

}