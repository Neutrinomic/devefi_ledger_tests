import { Principal } from '@dfinity/principal';

import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, CanBasic, BasicService, ICRCLedgerService, Ledger, realICPLedger, ICPLedgerService} from './common';




describe('burn', () => {
    let pic: PocketIc;
    let ledger: Actor<ICRCLedgerService>;
    let ledgerCanisterId: Principal;
    let ICPLedger: Actor<ICPLedgerService>;
    let user1: Actor<BasicService>;
    let userCanisterId1: Principal;
    let user2: Actor<BasicService>;
    let userCanisterId2: Principal;
    let user3: Actor<BasicService>;
    let userCanisterId3: Principal;

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
      
      // X1
      const fixture1 = await CanBasic(pic, ledgerCanisterId);
      user1 = fixture1.actor;
      userCanisterId1 = fixture1.canisterId;

      // X2
      const fixture2 = await CanBasic(pic, ledgerCanisterId);
      user2 = fixture2.actor;
      userCanisterId2 = fixture2.canisterId;

      // X3
      const fixture3 = await CanBasic(pic, ledgerCanisterId);
      user3 = fixture3.actor;
      userCanisterId3 = fixture3.canisterId;
      
      ledger.setPrincipal(jo.getPrincipal());
      await passTime(50);


     

    });
  
    afterAll(async () => {
      await pic.tearDown();
    });
  
    it(`Feed 3 canisters and let them make transactions`, async () => {
      const result1 = await ledger.icrc1_transfer({
        to: {owner: userCanisterId1, subaccount:[]},
        from_subaccount: [],
        amount: 1000000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
      const result2 = await ledger.icrc1_transfer({
        to: {owner: userCanisterId2, subaccount:[]},
        from_subaccount: [],
        amount: 1000000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });

      const result3 = await ledger.icrc1_transfer({
        to: {owner: userCanisterId3, subaccount:[]},
        from_subaccount: [],
        amount: 1000000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });

      await pic.stopCanister({ canisterId: ledgerCanisterId });
      await passTime(10);
      await pic.startCanister({ canisterId: ledgerCanisterId });
      await passTime(10);


      // stop user 1
      await pic.stopCanister({ canisterId: userCanisterId1 });
      await passTime(10);
      // start user 1
      await pic.startCanister({ canisterId: userCanisterId1 });
      await passTime(10);
      // stop user 2
      await pic.stopCanister({ canisterId: userCanisterId2 });
      await passTime(10);
      // start user 2
      await pic.startCanister({ canisterId: userCanisterId2 });
      await passTime(10);

      await pic.stopCanister({ canisterId: ledgerCanisterId });
      await passTime(10);
      await pic.startCanister({ canisterId: ledgerCanisterId });
      await passTime(10);

      // stop user 3
      await pic.stopCanister({ canisterId: userCanisterId3 });
      await passTime(10);
      // start user 3
      await pic.startCanister({ canisterId: userCanisterId3 });
      await passTime(10);

      await pic.stopCanister({ canisterId: ledgerCanisterId });
      await passTime(10);
      await pic.startCanister({ canisterId: ledgerCanisterId });
      await passTime(10);
  

      await passTime(50);


    }, 600*1000);

    it(`Check if all 3 canisters made transactions`, async () => {
      const result1 = await user1.get_info();
      const result2 = await user2.get_info();
      const result3 = await user3.get_info();
      expect(result1.pending).toBe(0n);
      expect(result2.pending).toBe(0n);
      expect(result3.pending).toBe(0n);
    });

    it(`Check ledger logs`, async () => {
      const result1 = await user1.get_info();
      const result2 = await user2.get_info();
      const result3 = await user3.get_info();
      let gt = await ledger.get_transactions({start: 0n, length: 100n});
      expect(gt.log_length).toBe(result1.last_indexed_tx);
      expect(gt.log_length).toBe(result2.last_indexed_tx);
      expect(gt.log_length).toBe(result3.last_indexed_tx);
      expect(gt.log_length).toBe(18003n);

    });

    it('Compare user<->ledger balances', async () => {
      let accounts = await user1.accounts();
      let idx =0;
      for (let [subaccount, balance] of accounts) {
        idx++;
        let ledger_balance = await ledger.icrc1_balance_of({owner: userCanisterId1, subaccount:[subaccount]});
        expect(toState(balance)).toBe(toState(ledger_balance));
      } 


      accounts = await user2.accounts();
      idx =0;
      for (let [subaccount, balance] of accounts) {
        idx++;
        let ledger_balance = await ledger.icrc1_balance_of({owner: userCanisterId2, subaccount:[subaccount]});
        expect(toState(balance)).toBe(toState(ledger_balance));
      } 


      accounts = await user3.accounts();
      idx =0;
      for (let [subaccount, balance] of accounts) {
        idx++;
        let ledger_balance = await ledger.icrc1_balance_of({owner: userCanisterId3, subaccount:[subaccount]});
        expect(toState(balance)).toBe(toState(ledger_balance));
      } 
    }, 600*1000);

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
