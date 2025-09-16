import { Keypair, TransactionBuilder, Asset, Operation, xdr, nativeToScVal, Address, scValToNative, Networks } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { client as sc_client, buildSinkCarbonXdr } from "@stellarcarbon/sc-sdk";
import { getWalletKit } from '@/lib/walletKit';
import { useWallet } from '@/hooks/useWallet';

sc_client.setConfig({
  baseUrl: "https://testnet-api.stellarcarbon.io",
});

const rpcUrl = 'https://soroban-testnet.stellar.org'
const USDC_SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const CARBON_SAC = "CCVMSAUB5RSCN7VFA2GESPVGRBNDHLQG5YDA7DST63OXJB5YBZGKEUVU"
const TESTNET_VAULT_ADDRESS = 'CCFZE6TOEZSTO2OEY5235UKFBB45BULTEPQ2GSKFXOGMYSO523W5FBCC';
const FEE_ADDRESS = "GCILP4HWE2QGEO4KUMOZ6S6J3A46W47EVCGZW2YPYCPH5CQF6EACNBCN";
// TODO: replace these addresses with actual TVault ones
export const USER_ADDRESSES = [
  "GCMFQP44AR32S7IRIUKNOEJW5PNWOCLRHLQWSHUCSV4QZOMUXZOVA7Q2",
  "GDOFDSMFRPOYTOLWODK4O6BZTGDJ4GRHLHX5THXN4TIFE2SXASQYFLPJ",
];

async function setup_account() {
  const keypair = Keypair.random();

  // Fund account with Friendbot
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(keypair.publicKey())}`
  );
  if (!response.ok) {
    throw new Error(`Friendbot request failed: ${response.status}`);
  }

  // Use RPC Server for transaction building/submission
  const server = new Server(rpcUrl);
  const account = await server.getAccount(keypair.publicKey());

  const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  const CARBON = new Asset("CARBON", "GDT5XM5C5STQZS5R3F4CEGKJWKDVWBIWBEV4TIYV5MDVVMKA775T4OKY");

  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: USDC }))
    .addOperation(Operation.changeTrust({ asset: CARBON }))
    .addOperation(Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: "5000",
      destination: keypair.publicKey(),
      destAsset: USDC,
      destAmount: "500",
      path: [],
    }))
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  const resp = await server.sendTransaction(tx);
  console.log(resp)

  // wait for the tx to be stored
  if (resp.status === "PENDING") {
    let getResponse = await server.getTransaction(resp.hash);
    
    // Poll until we get a final status
    while (getResponse.status === "NOT_FOUND") {
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(resp.hash);
    }
    
    // Now we have either SUCCESS or FAILED
    if (getResponse.status === "SUCCESS") {
      console.log("Transaction succeeded!");
      // Proceed with your logic
    } else {
      console.log("Transaction failed:", getResponse);
      // Handle the error
    }
  }

  return keypair;
}

export async function swap_usdc_to_carbon(source_amount: bigint, feeRecipientAddress: string): Promise<string> {
    // TODO: Implement soroswap integration once the router package is available
    // For now, return a placeholder transaction XDR that would need to be implemented
    // with the actual soroswap router functionality
    
    console.log(`Would swap ${source_amount} USDC to CARBON for ${feeRecipientAddress}`);
    return "placeholder_transaction_xdr";
}


export async function fetch_user_shares(addresses: string[]): Promise<Record<string, number>> {
  const server = new Server(rpcUrl);
  const balances: Record<string, bigint> = {};

  // Fetch balances for each address
  for (const address of addresses) {
    const storage_key = xdr.ScVal.scvVec([
      nativeToScVal("Balance", { type: "symbol" }),
      new Address(address).toScVal()
    ]);
    const data = await server.getContractData(TESTNET_VAULT_ADDRESS, storage_key);
    const entry_data = data.val as any;
    const sc_val = entry_data.contractData().val();
    const balance = scValToNative(sc_val) as bigint;
    balances[address] = balance;
  }

  // Calculate total balance
  const total = Object.values(balances).reduce((acc, b) => acc + b, 0n);

  // Normalize to floats so sum is 1
  const normalized: Record<string, number> = {};
  for (const [address, balance] of Object.entries(balances)) {
    normalized[address] = total === 0n ? 0 : Number(balance) / Number(total);
  }

  console.log(normalized)
  return normalized;
}


export async function sink_user_carbon(total_carbon: number, user_shares: Record<string, number>) {
  const results: any[] = [];

  // Sink CARBON for each vault user, in proportion to shares
  for (const [user, share] of Object.entries(user_shares)) {
    // Truncate to 3 decimals (not rounded)
    const carbon_share = Math.trunc(total_carbon * share * 1000) / 1000;

    const { data } = await buildSinkCarbonXdr({
      query: {
        funder: FEE_ADDRESS,
        recipient: user,
        carbon_amount: carbon_share,
        memo_type: 'text',
        memo_value: "Tansu Vault"
      }
    });

    console.log(data);
    results.push(data);
  }

  return results;
}
