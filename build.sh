#!/bin/sh

mops i
# Ensure the build directory exists
mkdir -p ./build

# Export PATH or any other environment variables if necessary to ensure commands are found
# export PATH="/path/to/your/commands:$PATH"
#mocv use 0.14.14
# Use GNU Parallel to process each *.test.mo file
find . -maxdepth 1 -name '*.test.mo' | parallel '
  # Extract the base name without the directory and .test.mo extension
  base_name=$(basename {} .test.mo);
  
  echo "Processing $base_name...";
  
  # Run moc to produce the wasm file. Adjust the moc command as necessary.
  `dfx cache show`/moc `mops sources` --idl --hide-warnings --error-detail 0 -o "./build/${base_name}.wasm" --idl {} &&
  
  # Assuming main.did is produced by the above moc command and matches the base name.
  # Generate JavaScript bindings
  didc bind "./build/${base_name}.did" --target js > "./build/${base_name}.idl.js" &&
  
  # Generate TypeScript bindings
  didc bind "./build/${base_name}.did" --target ts > "./build/${base_name}.idl.d.ts" ;
  
  echo "Finished processing $base_name"
'

./build_ntc.sh

# Note: GNU Parallel executes each job in a separate shell instance,
# so you might need to ensure that all necessary environment variables are exported or defined within the parallel command block.
