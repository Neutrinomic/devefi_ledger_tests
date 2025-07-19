import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';


import { toState, CanBasic, BasicService, Ledger, LedgerService} from './common';



describe('Counter', () => {
    let pic: PocketIc;
    let user: Actor<BasicService>;
    let ledger: Actor<LedgerService>;
    let userCanisterId: Principal;
    let ledgerCanisterId: Principal;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
  
    beforeAll(async () => {
      // console.log(`Jo Principal: ${jo.getPrincipal().toText()}`);
      // console.log(`Bob Principal: ${bob.getPrincipal().toText()}`);

      pic = await PocketIc.create(process.env.PIC_URL);
  
      // Ledger
      const ledger_fixture = await Ledger(pic, jo.getPrincipal());
      ledger = ledger_fixture.actor as Actor<LedgerService>;
      ledgerCanisterId = ledger_fixture.canisterId;
      
      // Ledger User
      const fixture = await CanBasic(pic, ledgerCanisterId);
      user = fixture.actor;
      userCanisterId = fixture.canisterId;

      await passTime(10);

      let meta = await user.getMeta();
    });
  
    afterAll(async () => {
      await pic.tearDown();
    });
  


    it(`Send 1 to Bob`, async () => {
      ledger.setIdentity(jo);
      const result = await ledger.icrc1_transfer({
        to: {owner: bob.getPrincipal(), subaccount:[]},
        from_subaccount: [],
        amount: 1_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
      expect(toState(result)).toStrictEqual({Ok:"0"});
    });

    it(`Check Bob balance`  , async () => {
      const result = await ledger.icrc1_balance_of({owner: bob.getPrincipal(), subaccount: []});
      expect(toState(result)).toBe("100000000")
    });



    it(`Check ledger transaction log`  , async () => {
      const result = await ledger.get_transactions({start: 0n, length: 100n});
      expect(result.transactions.length).toBe(1);
      expect(toState(result.log_length)).toBe("1");
      
    });



    it(`start and last_indexed_tx should be at 1`, async () => {
   

      await passTime(1);
      const result2 = await user.get_info();
      expect(toState(result2.last_indexed_tx)).toBe("1");
      
    });

    it(`feed ledger user and check if it made the transactions (from minter)`, async () => {
   
      const result = await ledger.icrc1_transfer({
        to: {owner: userCanisterId, subaccount:[]},
        from_subaccount: [],
        amount: 1000000_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });

      await passTime(120);

      const result2 = await user.get_info();

      expect(toState(result2.last_indexed_tx)).toBe("6002");
      
    }, 600*1000);


    it('Compare user<->ledger balances', async () => {
      let accounts = await user.accounts();
      let idx =0;
      for (let [subaccount, balance] of accounts) {
        idx++;
        if (idx % 50 != 0) continue; // check only every 50th account (to improve speed, snapshot should be enough when trying to cover all)
        let ledger_balance = await ledger.icrc1_balance_of({owner: userCanisterId, subaccount:[subaccount]});
        expect(toState(balance)).toBe(toState(ledger_balance));
      } 
    }, 190*1000);


    it('Compare user balances to snapshot', async () => {
      let accounts = await user.accounts();
      let f = accounts.map(x => x[1]).sort((a, b) => Number(a) - Number(b));
      expect(toState(f)).toMatchSnapshot()
    });

    
    it('Check if error log is empty', async () => {
      let errs = await user.get_errors();
      expect(toState(errs)).toStrictEqual([]);
    });

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
