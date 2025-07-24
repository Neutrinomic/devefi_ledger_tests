import { Principal } from '@dfinity/principal';

import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

  import { toState, CanBasic, CanNTC, NTCService, ICRCLedger, ICRCLedgerService, Ledger, realICPLedger, ICPLedgerService, CycleWalletService, CanCycleWallet} from './common';


const T = 1_000_000_000_000n;
const NT = T / 10000n;

describe('NTC', () => {
    let pic: PocketIc;
    let ledger: Actor<ICRCLedgerService>; 
    let ledgerCanisterId: Principal;
    let ICPLedger: Actor<ICPLedgerService>;
    let minter: Actor<NTCService>;
    let minterCanisterId: Principal;
    let cycleWallet: Actor<CycleWalletService>;
    let cycleWalletCanisterId: Principal;

    const jo = createIdentity('superSecretAlicePassword');
    const bob = createIdentity('superSecretBobPassword');
  
    beforeAll(async () => {


      pic = await PocketIc.create(process.env.PIC_URL);
      let minter_can_id = Principal.fromText("7ew52-sqaaa-aaaal-qsrda-cai");


      // Ledger
      const ledgerfixture = await ICRCLedger(pic, minter_can_id, undefined);
      ledger = ledgerfixture.actor;
      ledgerCanisterId = ledgerfixture.canisterId;
      
      const fixture1 = await CanNTC(pic, minter_can_id, ledgerCanisterId);
      minter = fixture1.actor;
      minterCanisterId = fixture1.canisterId;

      const cycleWalletfixture = await CanCycleWallet(pic);
      cycleWallet = cycleWalletfixture.actor;
      cycleWalletCanisterId = cycleWalletfixture.canisterId;

      
      // ledger.setPrincipal(jo.getPrincipal());
      await passTime(30);

    });
  
    afterAll(async () => {
      await pic.tearDown();
    });

    it(`Initial checks`, async () => {
      expect(minterCanisterId.toText()).toBe("7ew52-sqaaa-aaaal-qsrda-cai");

      let symbol = await ledger.icrc1_symbol();
      let decimals = await ledger.icrc1_decimals();
      let minter = await ledger.icrc1_minting_account();
      let name = await ledger.icrc1_name();
      let fee = await ledger.icrc1_fee();

      expect(decimals).toBe(8);
      expect(minter[0].owner.toText()).toBe(minterCanisterId.toText());
      expect(fee).toBe(10000n);
      
    });
    it(`Adding, burning cycles in cycle wallet`, async () => {
      const cyclesBalance = await cycleWallet.getCyclesBalance();
      expect(cyclesBalance).toBeGreaterThan(999999n*T);

      //add cycles
      const newCyclesBalance = await pic.addCycles(cycleWalletCanisterId, Number(100n*T));

      const cyclesBalance2 = await cycleWallet.getCyclesBalance();
      expect(cyclesBalance2).toBeGreaterThan(999999n*T + 100n*T);
      expect(cyclesBalance2).toBeLessThan(999999n*T + 101n*T);

      await cycleWallet.burn_my_cycles(ledgerCanisterId);

      const cyclesBalance3 = await cycleWallet.getCyclesBalance();
      expect(cyclesBalance3).toBeLessThan(T / 2n);

      await pic.addCycles(cycleWalletCanisterId, Number(1000n*T));
      const cyclesBalance4 = await cycleWallet.getCyclesBalance();
      expect(cyclesBalance4).toBeGreaterThan(1000n*T);


    });

    it(`Get minter stats`, async () => {
      const stats = await minter.stats();
      expect(stats.failed_topups).toBe(0n); 
      expect(stats.cycles).toBeGreaterThan(999999n*T);
      expect(stats.cycles).toBeLessThan(1000000n*T);
      expect(stats.topped_up).toBe(0n);
      
    });
  
    it(`Mint NTC`, async () => {
      await cycleWallet.mint_ntc(1n*T, {owner:bob.getPrincipal(), subaccount:[]});

      expect(await cycleWallet.getCyclesBalance()).toBeLessThan(1000n*T);

      await passTime(20);

      let log = await ledger.get_transactions({start:0n, length:100n});
      expect(log.log_length).toBe(1n);

      expect(toState(log.transactions[0])).toMatchSnapshot();

      // Check ledger balance 
      const ledgerBalance = await ledger.icrc1_balance_of({owner:bob.getPrincipal(), subaccount:[]});
      expect(ledgerBalance).toBe(99990000n);


    }, 600*1000);

    it(`Get minter stats`, async () => {
      const stats = await minter.stats();
      expect(stats.failed_topups).toBe(0n); 
      expect(stats.cycles).toBeGreaterThan(1000000n*T);
      expect(stats.topped_up).toBe(0n);
      
    });
    
    it(`Mint lots of NTC`, async () => {

      for (let i=0; i<100; i++) {
        await cycleWallet.mint_ntc(1n*T, {owner:bob.getPrincipal(), subaccount:[]});
      }
     
      await passTime(10);
      let log = await ledger.get_transactions({start:0n, length:101n});
      expect(log.log_length).toBe(101n);

    }, 600*1000);

    it(`Check ledger balance`, async () => {
      const ledgerBalance = await ledger.icrc1_balance_of({owner:bob.getPrincipal(), subaccount:[]});
      expect(ledgerBalance).toBe(10098990000n);
    });

it(`Burn NTC`, async () => {


  let wallet_balance = await cycleWallet.getCyclesBalance();

  expect(wallet_balance/T).toBe(899n);

  let topup_account_resp = await minter.get_account( cycleWalletCanisterId);
  let topup_account = topup_account_resp[0];
  let topup_account_text = topup_account_resp[1];

  expect(topup_account_resp).toMatchSnapshot();
  
  // Bob sends NTC to topup account
  ledger.setPrincipal(bob.getPrincipal());
  let resp = await ledger.icrc1_transfer({
    to: topup_account,
    from_subaccount: [],
    amount: 10n * NT,
    fee: [],
    memo: [],
    created_at_time: [],
  });

  expect(toState(resp).Ok).toBe("101");

  await passTime(5);

  let wallet_balance_after = await cycleWallet.getCyclesBalance();

  expect(wallet_balance_after/T).toBe((wallet_balance + 10n*T - T/10n)/T);

  expect(wallet_balance_after/T).toBe(899n + 9n);
});


it(`Make a lot of burn requests`, async () => {

  await cycleWallet.mint_ntc(100n*T, {owner:bob.getPrincipal(), subaccount:[]});
  await passTime(2);
  
  let wallet_balance = await cycleWallet.getCyclesBalance();

  expect(wallet_balance/T).toBe(808n);

  let topup_account_resp = await minter.get_account( cycleWalletCanisterId);
  let topup_account = topup_account_resp[0];
  let topup_account_text = topup_account_resp[1];

  expect(topup_account_resp).toMatchSnapshot();
  
  // Bob sends NTC to topup account
  ledger.setPrincipal(bob.getPrincipal());
  for (let i=0; i<100; i++) {
    let resp = await ledger.icrc1_transfer({
      to: topup_account,
      from_subaccount: [],
      amount: 1n * NT,
      fee: [],
      memo: [],
      created_at_time: [],
    });

    expect(toState(resp).Err).not.toBeDefined();
  };

  
  await passTime(40);

  let wallet_balance_after = await cycleWallet.getCyclesBalance();
  let one_fill = 1n*T - T/10n;
  expect(wallet_balance_after/T).toBe((wallet_balance + one_fill*100n)/T);
expect((wallet_balance + one_fill*100n)/T).toBe(808n + 90n);

});

it(`Check stats for burned and failed topups`, async () => {

  let stats = await minter.stats();
  expect(stats.failed_topups).toBe(0n);
  expect(stats.cycles/T).toBeGreaterThan(1000000n);
  expect(stats.topped_up/T).toBe(99n);
  

});


it(`Check if minter queue is empty and all is sent`, async () => {
  let queue = await minter.get_queue();
  expect(queue.length).toBe(0);
});


it(`Send to non existing canister`, async () => {
  let topup_account_resp = await minter.get_account(Principal.fromText("togwv-zqaaa-aaaal-qr7aa-cai"));
  let topup_account = topup_account_resp[0];
  let topup_account_text = topup_account_resp[1];

  let resp = await ledger.icrc1_transfer({
    to: topup_account,
    from_subaccount: [],
    amount: 10n * NT,
    fee: [],
    memo: [],
    created_at_time: [],
  });

  expect(toState(resp).Err).not.toBeDefined();
  await passTime(10);
  let queue = await minter.get_queue();
  expect(queue.length).toBe(1);

});

it(`Wait for it to fail`, async () => {
  
  let stats_before = await minter.stats();
  expect(stats_before.topped_up/T).toBe(99n);
  expect(stats_before.cycles/T).toBe(1000101n);
  expect(stats_before.failed_topups).toBe(0n);
  for (let i=0; i<100; i++) {
    await pic.advanceTime(60*1000);
    await pic.tick(1);
  }
  
  let queue = await minter.get_queue();
  expect(queue.length).toBe(0);

  let stats = await minter.stats();
  expect(stats.topped_up/T).toBe(99n);
  expect(stats.cycles/T).toBe(1000101n);
  expect(stats.failed_topups/T).toBe(9n);

});


  async function passTime(n:number) {
    for (let i=0; i<n; i++) {
      await pic.advanceTime(3*1000);
      await pic.tick(2);
    }
  }

});
