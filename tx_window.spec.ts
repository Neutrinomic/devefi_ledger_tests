import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, BurnService, CanBurn, ICRCLedgerService, ICRCLedger, Ledger, BURN_WASM_PATH, burnInit, LEDGER_TYPE } from './common';


describe('tx window', () => {
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
        const ledgerfixture = await Ledger(pic, jo.getPrincipal() );
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
  
    it(`Mint from Jo to canister`, async () => {
        ledger.setIdentity(jo);
        let resp = await ledger.icrc1_transfer({
            to: {owner: userCanisterId, subaccount:[]},
            from_subaccount: [],
            amount: 100_0000_0000n,
            fee: [],
            memo: [],
            created_at_time: [],
        });
        await passTime(1);

    });
    
    it(`Burn cycles`, async () => {
        await user.simulate_cycle_outage_while_sending(ledgerCanisterId, {owner: zoo.getPrincipal(), subaccount:[]});
    });

    it(`Check if we got out of cycles pending tx`, async () => {
     
          await passTime(50);

          let resp2 = await user.get_info();
          expect(toState(resp2.pending)).toBe("77");

    });

    it(`Make thousands of txs`, async () => {
        for (let i=0; i<1000; i++) {
            await ledger.icrc1_transfer({
                to: {owner: bob.getPrincipal(), subaccount:[]},
                from_subaccount: [],
                amount: 100_000n,
                fee: [],
                memo: [],
                created_at_time: [],
            });
            if (i % 1000 === 0) {
                await passTime(1);
            }
        };
        
    }, 600*1000);

    var zooBalanceBeforeResume = 0n;
    it(`Store zoo balance before resume`, async () => {
        zooBalanceBeforeResume = await ledger.icrc1_balance_of({owner: zoo.getPrincipal(), subaccount:[]});
        expect(zooBalanceBeforeResume).toBe(0n);
    });

    it(`Refill canister with cycles. However sender timer wont start`, async () => {
        await pic.addCycles(userCanisterId, 100_000_000_000_000_000);
        await passTime(50);
        let resp2 = await user.get_info();
        expect(toState(resp2.pending)).toBe("77");
    });

    it(`Move time 25hours ahead`, async () => {
        await pic.advanceTime(25*60*60*1000);
        await passTime(1);
    });


    it(`Upgrade canister and make timers start again `, async () => {
       await pic.upgradeCanister({ canisterId: userCanisterId, wasm: BURN_WASM_PATH, arg: IDL.encode(burnInit({ IDL }), [{ledgerId: ledgerCanisterId, ledger_type: {[LEDGER_TYPE]:null}}]) });
    });


    it(`Check if we got out of cycles pending tx`, async () => {
     
        await passTime(50);

        let resp2 = await user.get_info();
        expect(toState(resp2.pending)).toBe("0");

  });


    it(`Check if there was double spending`, async () => {
        let newZooBalance = await ledger.icrc1_balance_of({owner: zoo.getPrincipal(), subaccount:[]});
        let calc_balance = zooBalanceBeforeResume  + 77n*90_000n;
        expect(newZooBalance).toBe(calc_balance);
        
    });
    // it(`Stop ledger`, async () => {
    //   await pic.stopCanister({canisterId: ledgerCanisterId});
    // });

    // it(`Make sure ledger is down`, async () => {
    //     try {
    //       await ledger.get_transactions({start: 0n, length: 100n});
    //     } catch (e:any) {
    //       expect(e.message).toContain("is stopped");
    //     }
    // });

    // it(`Send transactions from canister`, async () => {
    //     for (let i=0; i<10; i++) {
    //     let resp = await user.send_to(
    //             {owner: bob.getPrincipal(), subaccount:[]},
    //             100000n
    //         );
    //     };
    //     await passTime(1);
    //     let resp2 = await user.get_info();
        
    //     expect(toState(resp2.pending)).toBe("10");

    //     // Wait for the system to retry sending the transactions
    //     await passTime(150);
    
       
    // });

    // it(`Start ledger`, async () => {
    //   await pic.startCanister({canisterId: ledgerCanisterId});
    // });


    // it(`Check if transactions have arrived`, async () => {
    //     await passTime(10);
    //     let resp = await user.get_info();
    //     expect(toState(resp.last_indexed_tx)).toBe("12");
    //     expect(toState(resp.pending)).toBe("0");
    // });


    // it(`Try sending more than the balance`, async () => {
    //     let rez = await user.send_to(
    //             {owner: bob.getPrincipal(), subaccount:[]},
    //             1_00000_0000n
    //         );
    //     expect(toState(rez).err).toStrictEqual({ "InsufficientFunds": null });
    // });


    // it(`Stop ledger`, async () => {
    //     await pic.stopCanister({canisterId: ledgerCanisterId});
    //   });

    //   it(`Send more transactions from canister`, async () => {
    //     for (let i=0; i<10; i++) {
    //     let resp = await user.send_to(
    //             {owner: bob.getPrincipal(), subaccount:[]},
    //             100000n
    //         );
    //     };
    //     await passTime(1);
    //     let resp2 = await user.get_info();
        
    //     expect(toState(resp2.pending)).toBe("10");

    //     // Wait for the system to retry sending the transactions
    //     await passTime(150);
    
       
    // });
      

    // it(`Start ledger after 25 hours (out of tx window)`, async () => {
    //     await pic.startCanister({canisterId: ledgerCanisterId});
    //     // Check if ledger canister is up
    //     let resp = await ledger.icrc1_fee();
    //     expect(resp).toBe(10000n);
    //     await pic.advanceTime(25*60*60*1000);
    //     await passTime(1);

    //   });

    // it(`Check if transactions have arrived 2`, async () => {
    //     await passTime(40);
    //     let resp = await user.get_info();
    //     let errs = await user.get_errors();
        
    //     expect(toState(resp.pending)).toBe("0");

    //     expect(toState(resp.last_indexed_tx)).toBe("22");
        
    // });

    // it(`Stop ledger`, async () => {
    //     await pic.stopCanister({canisterId: ledgerCanisterId});
    // });

    
    // it(`Send transactions from canister`, async () => {
    //     let bal = await user.get_balance([]);
    //     expect(bal).toBe(97900000n);
    //     for (let i=0; i<10; i++) {
    //     let resp = await user.send_to(
    //             {owner: bob.getPrincipal(), subaccount:[]},
    //             100000n
    //         );
    //     };
    //     await passTime(1);
    //     let resp2 = await user.get_info();
    //     let bal2 = await user.get_balance([]);

    //     expect(bal2).toBe(98000000n - 11n*100000n);
    //     expect(toState(resp2.pending)).toBe("10");

    //     // Wait for the system to retry sending the transactions
    //     await passTime(150);
    // });

    // it(`Stop user canister`, async () => {
    //     await pic.stopCanister({canisterId: userCanisterId});
    // });

    // it(`Start ledger after 25h`, async () => {
    //     await pic.advanceTime(25*60*60*1000);
    //     await passTime(1);
    //     await pic.startCanister({canisterId: ledgerCanisterId});
      
    // });

    // it(`Start user canister`, async () => {
    //     await pic.startCanister({canisterId: userCanisterId});
    // });

    // it(`Check if transactions have arrived`, async () => {
    //     await passTime(40);
    //     let resp = await user.get_info();
    //     let bal2 = await user.get_balance([]);
    //     expect(bal2).toBe(98000000n - 11n*100000n);
    //     expect(toState(resp.last_indexed_tx)).toBe("32");
    //     expect(toState(resp.pending)).toBe("0");
    // });

    


    async function passTime(n:number) {
      for (let i=0; i<n; i++) {
        await pic.advanceTime(3*1000);
        await pic.tick(2);
      }
    }

});

