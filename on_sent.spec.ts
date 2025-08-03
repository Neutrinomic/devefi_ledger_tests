import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, BurnService, CanBurn, ICRCLedgerService, ICRCLedger, Ledger } from './common';


describe('OnSent', () => {
    let pic: PocketIc;
    let user: Actor<BurnService>;
    let ledger: Actor<ICRCLedgerService>;
    let userCanisterId: Principal;
    let ledgerCanisterId: Principal;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
  
    beforeAll(async () => {

      pic = await PocketIc.create(process.env.PIC_URL);
  
      // Ledger
      const ledgerfixture = await Ledger(pic, jo.getPrincipal());
      ledger = ledgerfixture.actor;
      ledgerCanisterId = ledgerfixture.canisterId;
      
      // Ledger User
      const fixture = await CanBurn(pic, ledgerCanisterId, undefined  );
      user = fixture.actor;
      userCanisterId = fixture.canisterId;

      ledger.setPrincipal(jo.getPrincipal());
      await passTime(50);

    });
  
    afterAll(async () => {
      await pic.tearDown();
    });
  

    it(`feed ledger user and check if it made the transactions`, async () => {
   
      const result = await ledger.icrc1_transfer({
        to: {owner: userCanisterId, subaccount:[]},
        from_subaccount: [],
        amount: 100000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
      await passTime(40);

      const result2 = await user.get_info();

      expect(toState(result2.last_indexed_tx)).toBe("1");
      
    }, 600*1000);



    it(`Send tx`, async () => {
      let resp = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );

      await passTime(3);
      expect(toState(resp).ok).toBeDefined();
    });
    
    it(`Check onReceive`, async () => {
      let resp = await user.getSentTxs();
      expect(resp[0][1]).toEqual(1n);
    });

    it(`Send 2 tx`, async () => {
      let resp2 = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );
      let resp3 = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );
      await passTime(3);
      expect(toState(resp2).ok).toBeDefined();
      expect(toState(resp3).ok).toBeDefined();
    });

    it(`Check onReceive`, async () => {
      let resp = await user.getSentTxs();
      expect(resp.map(x => x[1])).toEqual([
        1n,
        2n,
        3n,
      ]);
    });

    it(`Send ledger tx`, async () => {
      const result = await ledger.icrc1_transfer({
        to: {owner: userCanisterId, subaccount:[]},
        from_subaccount: [],
        amount: 100000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
    });

    it(`Send 2 tx`, async () => {
      let resp2 = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );
      let resp3 = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );
      await passTime(3);
      expect(toState(resp2).ok).toBeDefined();
      expect(toState(resp3).ok).toBeDefined();
    });

    it(`Check onReceive`, async () => {
      let resp = await user.getSentTxs();
      expect(resp.map(x => x[1])).toEqual([
        1n,
        2n,
        3n,
        5n,
        6n,
      ]);
    });

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
