import { Principal } from '@dfinity/principal';

import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, CanBurn, BurnService, ICRCLedgerService, ICRCLedger} from './common';




describe('burn', () => {
    let pic: PocketIc;
    let user: Actor<BurnService>;
    let ledger: Actor<ICRCLedgerService>;
    let userCanisterId: Principal;
    let ledgerCanisterId: Principal;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
  
    beforeAll(async () => {
      // console.log(`Jo Principal: ${jo.getPrincipal().toText()}`);
      // console.log(`Bob Principal: ${bob.getPrincipal().toText()}`);

      pic = await PocketIc.create(process.env.PIC_URL);
  
      // Ledger
      const ledgerfixture = await ICRCLedger(pic, jo.getPrincipal(), undefined);
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
      expect(toState(errs)).toStrictEqual([]);
    });

    it(`Check ledger balance of bob`, async () => {
      let resp = await ledger.icrc1_balance_of({owner: bob.getPrincipal(), subaccount:[]});

      expect(resp).toBe(1_0000_0000n - 10000n);
    });


    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
