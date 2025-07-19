import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, createIdentity } from '@dfinity/pic';
import { IDL } from '@dfinity/candid';

import { toState, PassbackService, CanPassback, ICRCLedgerService, ICRCLedger, Ledger } from './common';



describe('Passback', () => {
  let pic: PocketIc;
  let user: Actor<PassbackService>;
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
    const fixture = await CanPassback(pic, ledgerCanisterId);
    user = fixture.actor;
    userCanisterId = fixture.canisterId;

    await passTime(10);
  });

  afterAll(async () => {
    await pic.tearDown();
  });

 

  it(`Send 1 to Bob`, async () => {
    ledger.setIdentity(jo);
    const result = await ledger.icrc1_transfer({
      to: { owner: bob.getPrincipal(), subaccount: [] },
      from_subaccount: [],
      amount: 1_0000_0000n,
      fee: [],
      memo: [],
      created_at_time: [],
    });
    expect(toState(result)).toStrictEqual({ Ok: "0" });
  });

  it(`Check Bob balance`, async () => {
    ledger.setIdentity(bob);
    const result = await ledger.icrc1_balance_of({ owner: bob.getPrincipal(), subaccount: [] });
    expect(toState(result)).toBe("100000000")
  });


  it(`Start passback`, async () => {

    await passTime(3);
    let real = await ledger.get_transactions({ start : 0n, length : 0n });

    const result2 = await user.get_info();
    

    let meta = await user.getMeta();
    
    expect(result2.last_indexed_tx).toBe(real.log_length);

  });

  it(`Bob sends to passback`, async () => {
    ledger.setIdentity(bob);


    const result = await ledger.icrc1_transfer({
      to: { owner: userCanisterId, subaccount: [] },
      from_subaccount: [],
      amount: 5000_0000n,
      fee: [],
      memo: [],
      created_at_time: [],
    });
    expect(toState(result)).toStrictEqual({ Ok: "1" });
  });

  it(`Check Bob balance before passback reacts`, async () => {
    const result = await ledger.icrc1_balance_of({ owner: bob.getPrincipal(), subaccount: [] });
    expect(toState(result)).toBe("49990000")
  });


  it(`Check Bob balance after passback reacts`, async () => {
    await passTime(5);

    const result = await ledger.icrc1_balance_of({ owner: bob.getPrincipal(), subaccount: [] });
    expect(toState(result)).toBe("99980000")
  });


  async function passTime(n: number) {
    for (let i = 0; i < n; i++) {
      await pic.advanceTime(3 * 1000);
      await pic.tick(1);
    }
  }

});
