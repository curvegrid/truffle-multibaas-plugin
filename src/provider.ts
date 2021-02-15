// Copyright (c) 2020 Curvegrid Inc.

import provider from "@truffle/hdwallet-provider";
import { getHost } from "./config";

const Web3APIEnvKey = "MB_PLUGIN_WEB3_KEY";

interface Options {
  addressIndex?: number;
  numAddresses?: number;
  shareNonce?: boolean;
  walletHdpath?: string;
  insecureOk?: boolean;
  apiKey?: string;
}

/**
 * The MultiBaas provider.
 *
 * You need the `MB_PLUGIN_WEB3_KEY` environment variable set.
 */
export default class Provider extends provider {
  /**
   * Create a provider from the given development ID and private keys/mnemonics/wallet.
   *
   * For parameters other than `deploymentID`, consult
   * https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider
   * @param deploymentID The MultiBaas deployment ID.
   */
  constructor(
    mnemonic: string | string[],
    deploymentID: string,
    options: Options = { insecureOk: false },
  ) {
    const apiKey = options.apiKey || process.env[Web3APIEnvKey];

    super(
      // @ts-ignore
      mnemonic,
      `${getHost(deploymentID, options.insecureOk)}/web3/${apiKey}`,
      options.addressIndex,
      options.numAddresses,
      options.shareNonce,
      options.walletHdpath,
    );
  }
}
