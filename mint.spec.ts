import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, BurnService, CanBurn, ICRCLedgerService, ICRCLedger } from './common';



describe('Mint', () => {
    let pic: PocketIc;
    let ledger: Actor<ICRCLedgerService>;
    let ledgerCanisterId: Principal;
    let user: Actor<BurnService>;
    let userCanisterId: Principal;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
    const zoo = createIdentity('superSecretZooPassword');
  
    beforeAll(async () => {


        pic = await PocketIc.create(process.env.PIC_URL);

        userCanisterId = Principal.fromText("extk7-gaaaa-aaaaq-aacda-cai");


        // Ledger
        const ledgerfixture = await ICRCLedger(pic, userCanisterId, undefined );
        ledger = ledgerfixture.actor;
        ledgerCanisterId = ledgerfixture.canisterId;


        // Ledger User
        const fixture = await CanBurn(pic, ledgerCanisterId, userCanisterId);
        user = fixture.actor;

        await passTime(15);

    });
  
    afterAll(async () => {
      await pic.tearDown();
    });
  
    it(`Check if canister is the minter`, async () => {
        let resp = await ledger.icrc1_minting_account();
        expect(resp[0].owner.toText()).toBe(userCanisterId.toText());

        let resp2 = toState(await user.getMeta());
        
        expect(resp2.minter[0].owner).toBe(userCanisterId.toText());
        

    });

    it(`Mint from canister to Bob`, async () => {
        let resp = await user.send_to(
            {owner: bob.getPrincipal(), subaccount:[]},
            1_0000_0000n
          );
    
          await passTime(2);
    
          expect(toState(resp).ok).toBeDefined();
    });
    
    it(`Check if minter is set`, async () => {
        let resp = await ledger.icrc1_minting_account();

        expect(resp[0].owner.toText()).toBe(userCanisterId.toText());
    });

    it(`Check transaction log canister`, async () => {
        let resp = await user.get_info();
        expect(toState(resp.last_indexed_tx)).toBe("1");
    });

    it(`Check transaction log ledger`, async () => {
        let resp = await ledger.get_transactions({start: 0n, length: 100n});
        expect(toState(resp.transactions.length)).toBe(1);

        let tx = resp.transactions[0];
        expect(tx.kind).toBe("mint");
        expect(tx.mint[0].to.owner.toText()).toBe(bob.getPrincipal().toText());
        expect(tx.mint[0].amount).toBe(99990000n);
        expect(Array.from(tx.mint[0].memo[0])).toStrictEqual([0,0,0,0,0,0,0,1]);
        expect(tx.mint[0].created_at_time[0]).toBeDefined();
    });

    it(`Mint dust (=fee) from canister to Bob`, async () => {
        let resp = await user.send_to(
            {owner: bob.getPrincipal(), subaccount:[]},
            10000n
          );
    
          await passTime(4);
          // <= fee should be ignored
       

          let resp2 = await user.get_info();
          expect(toState(resp2.last_indexed_tx)).toBe("1");

          let resp3 = await ledger.get_transactions({start: 0n, length: 100n});
          expect(toState(resp3.transactions.length)).toBe(1);
    });

    it(`Mint dust (<fee) from canister to Bob`, async () => {
        let resp = await user.send_to(
            {owner: bob.getPrincipal(), subaccount:[]},
            1000n
          );
    
          await passTime(4);
          // <= fee should be ignored


          let resp2 = await user.get_info();
          expect(toState(resp2.last_indexed_tx)).toBe("1");

          let resp3 = await ledger.get_transactions({start: 0n, length: 100n});
          expect(toState(resp3.transactions.length)).toBe(1);
    });

    it(`Mint dust (fee + 1) from canister to Bob`, async () => {
        let resp = await user.send_to(
            {owner: bob.getPrincipal(), subaccount:[]},
            10001n
          );
    
          await passTime(2);
          // <= fee should be ignored
     

          let resp2 = await user.get_info();
          expect(toState(resp2.last_indexed_tx)).toBe("2"); // this should pass

          let resp3 = await ledger.get_transactions({start: 0n, length: 100n});
          expect(toState(resp3.transactions.length)).toBe(2);

          expect(resp3.transactions[1].mint[0].amount).toBe(1n);
    });

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
