#!/bin/sh


cd ../NTC
`dfx cache show`/moc `mops sources` --idl --hide-warnings -o "../devefi_ledger_tests/build/NTC.wasm" ./src/ntc.mo

cd ../devefi_ledger_tests
  
didc bind "./build/NTC.did" --target js > "./build/NTC.idl.js"
didc bind "./build/NTC.did" --target ts > "./build/NTC.idl.d.ts"
  