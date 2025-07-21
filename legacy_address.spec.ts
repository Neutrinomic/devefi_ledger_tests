import { Principal } from '@dfinity/principal';

import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, CanBurn, BurnService, ICRCLedgerService, Ledger, LEDGER_TYPE, account2aid, ICPLedger, realICPLedger, ICPLedgerService} from './common';
import { AccountIdentifier } from '@dfinity/ledger-icp';




describe('Legacy address', () => {
    let pic: PocketIc;
    let user: Actor<BurnService>;
    let ledger: Actor<ICRCLedgerService>;
    let userCanisterId: Principal;
    let ledgerCanisterId: Principal;
    let ICPLedger: Actor<ICPLedgerService>;

    const jo = createIdentity('superSecretAlicePassword');
    
    const bob = createIdentity('superSecretBobPassword');
    const gee = createIdentity('superSecretGeePassword');
  
    beforeAll(async () => {
      // console.log(`Jo Principal: ${jo.getPrincipal().toText()}`);
      // console.log(`Bob Principal: ${bob.getPrincipal().toText()}`);

      pic = await PocketIc.create(process.env.PIC_URL);
  
      // Ledger
      const ledgerfixture = await Ledger(pic, Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"));
      ledger = ledgerfixture.actor;
      ledgerCanisterId = ledgerfixture.canisterId;
      
      // Ledger User
      const fixture = await CanBurn(pic, ledgerCanisterId, undefined);
      user = fixture.actor;
      userCanisterId = fixture.canisterId;

      ledger.setPrincipal(Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"));
      
      ICPLedger = await realICPLedger(pic, ledgerCanisterId);
      
      await passTime(50);

    });
  
    afterAll(async () => {
      await pic.tearDown();
    });
  

    if (LEDGER_TYPE == "icrc") {
      it(`No need for legacy address test`, async () => {
        expect(true).toBe(true);
      });
    } else {
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


    it(`Get balance`, async () => {
      let resp = await user.get_balance([]);

      expect(resp).toBe(1000_0000_0000n);
    });

    it(`Send tx`, async () => {


      let resp = await user.send_to_icp(
        account2aid({owner: gee.getPrincipal(), subaccount:[]}).toUint8Array(),
        1000_0000n
      );

      await passTime(10);


      expect(toState(resp).ok).toBeDefined();
    });
    

    it(`Get canister balance`, async () => {
      let resp = await user.get_balance([]);

      expect(resp).toBe(1000_0000_0000n - 1000_0000n);

    });

    it(`Check Gee balance`, async () => {
      let resp = await ledger.icrc1_balance_of({owner: gee.getPrincipal(), subaccount:[]});
      expect(resp).toBe(1000_0000n - 10_000n);
    });

    it(`Check info`, async () => {

      let resp = await user.get_info();
      expect(resp.pending).toBe(0n);
      
    });


    it(`Burn tx`, async () => {
      let resp = await user.send_to_icp(
        account2aid({owner: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"), subaccount:[]}).toUint8Array(),
        1000_0000n
      );

      await passTime(5);


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

    it(`Check ledger balance of canister from ledger`, async () => {
      let resp = await ledger.icrc1_balance_of({owner: userCanisterId, subaccount:[]});
      expect(resp).toBe(1000_0000_0000n - 1000_0000n - 1000_0000n);
    });

    it(`Check ledger balance of canister from can`, async () => {
      let r = await user.get_balance([]);
      expect(r).toBe(1000_0000_0000n - 1000_0000n - 1000_0000n);
    });


    it(`Send to legacy address`, async () => {
      let resp = await ledger.icrc1_transfer({
        to: {owner: jo.getPrincipal(), subaccount:[]},
        from_subaccount: [],
        amount: 10_0000_0000n,
        fee: [],
        memo: [],
        created_at_time: [],
      });
    });


     it(`Check if jo has funds`, async () => {
      let resp = await ledger.icrc1_balance_of({owner: jo.getPrincipal(), subaccount:[]});
      expect(resp).toBe(10_0000_0000n);
     });



    it(`Check deduplication`, async() => {

      ICPLedger.setPrincipal(jo.getPrincipal());

        const result = await ledger.get_transactions({start: 0n, length: 100n});
        expect(result.log_length).toBe(4n);
        let created_at = BigInt(Math.round(await pic.getTime())) * 1000000n;
        for (let i=0; i<10; i++) {
          ledger.setIdentity(jo);
          let trez = await ICPLedger.transfer({
            to: account2aid({owner: gee.getPrincipal(), subaccount:[]}).toUint8Array(),
            from_subaccount: [],
            amount: {e8s: 100_0000n},
            fee: {e8s: 10_000n},
            memo: 1n,
            created_at_time: [{timestamp_nanos: created_at}], // time in nanoseconds since epoch
          });
          
          if (i == 0) expect(toState(trez).Ok).toBe("4");
       
          if (i > 0) expect(toState(trez).Err).toStrictEqual({"TxDuplicate": {"duplicate_of": "4"}});
        }

        const result2 = await ledger.get_transactions({start: 0n, length: 100n});
        expect(result2.log_length).toBe(5n); // Only one new transaction should be added



    });

    
  };

    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});
