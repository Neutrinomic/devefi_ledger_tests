import { Principal } from '@dfinity/principal';

import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, CanBurn, BurnService, ICRCLedgerService, Ledger, realICPLedger, ICPLedgerService} from './common';




describe('burn', () => {
    let pic: PocketIc;
    let user: Actor<BurnService>;
    let ledger: Actor<ICRCLedgerService>;
    let userCanisterId: Principal;
    let ledgerCanisterId: Principal;
    let ICPLedger: Actor<ICPLedgerService>;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
  
    beforeAll(async () => {
      // console.log(`Jo Principal: ${jo.getPrincipal().toText()}`);
      // console.log(`Bob Principal: ${bob.getPrincipal().toText()}`);

      pic = await PocketIc.create(process.env.PIC_URL);
  
      // Ledger
      const ledgerfixture = await Ledger(pic, jo.getPrincipal());
      ledger = ledgerfixture.actor;
      ledgerCanisterId = ledgerfixture.canisterId;
      
      // Ledger User
      const fixture = await CanBurn(pic, ledgerCanisterId, undefined);
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
        amount: 1000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
      await passTime(40);

      const result2 = await user.get_info();

      expect(toState(result2.last_indexed_tx)).toBe("1");
      
    }, 600*1000);

    it(`feed ledger user and check if it made the transactions`, async () => {
   
      const result = await ledger.icrc1_transfer({
        to: {owner: userCanisterId, subaccount:[]},
        from_subaccount: [],
        amount: 2000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
      await passTime(40);

      const result2 = await user.get_info();
      expect(toState(result2.last_indexed_tx)).toBe("2");
      
    }, 600*1000);

    it(`Get balance`, async () => {
      let resp = await user.get_balance([]);

      expect(resp).toBe(3000_0000_0000n);
    });

    it(`Send tx`, async () => {
      let resp = await user.send_to(
        {owner: bob.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );

      await passTime(40);


      expect(toState(resp).ok).toBeDefined();
    });
    

    it(`Get balance`, async () => {
      let resp = await user.get_balance([]);

      expect(resp).toBe(3000_0000_0000n - 1_0000_0000n);
    });

    it(`Check info`, async () => {

      let resp = await user.get_info();
      expect(resp.pending).toBe(0n);
      
    });


    it(`Burn tx`, async () => {
      let resp = await user.send_to(
        {owner: jo.getPrincipal(), subaccount:[]},
        1_0000_0000n
      );

      await passTime(40);


      expect(toState(resp).ok).toBeDefined();
    });

 
    it(`Check info`, async () => {

      let resp = await user.get_info();
      expect(resp.pending).toBe(0n);
      
    });


    it('Check if error log is empty', async () => {
      let errs = await user.get_errors();
      expect(toState(errs).length).toBe(1);
    });

    it(`Check ledger balance of bob`, async () => {
      let resp = await ledger.icrc1_balance_of({owner: bob.getPrincipal(), subaccount:[]});

      expect(resp).toBe(1_0000_0000n - 10000n);
    });


    it(`Send tx with memo`, async () => {
      let resp = await user.send_to_with_memo(
        {owner: bob.getPrincipal(), subaccount:[]},
        101_0000n,
        [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]]
      );
      await passTime(5);
    });

    it('Check if it went through', async () => {
      let errs = await user.get_errors();
      expect(toState(errs).length).toBe(1);

      let resp2 = await user.get_info();
      expect(resp2.pending).toBe(0n);

      let resp3 = await ledger.icrc1_balance_of({owner: bob.getPrincipal(), subaccount:[]});
      expect(resp3).toBe(1_0000_0000n - 10000n + 100_0000n);
    });

    it(`Send tx with memo - shorter`, async () => {
      let resp = await user.send_to_with_memo(
        {owner: bob.getPrincipal(), subaccount:[]},
        101_0000n,
        [[6, 2, 3, 4, 5 ,6 ,7, 8]]
      );
      await passTime(5);
    });

    it('Check if it went through', async () => {
      let errs = await user.get_errors();
      expect(toState(errs).length).toBe(1);

      let resp2 = await user.get_info();
      expect(resp2.pending).toBe(0n);

      let resp3 = await ledger.icrc1_balance_of({owner: bob.getPrincipal(), subaccount:[]});
      expect(resp3).toBe(1_0000_0000n - 10000n + 200_0000n);
    });

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
