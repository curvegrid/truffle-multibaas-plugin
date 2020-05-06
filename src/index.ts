// Copyright (c) 2020 Curvegrid Inc.

import TruffleContract from "@truffle/contract";
import getConfig, { Config } from "./config";
import axios, { AxiosRequestConfig } from "axios";
import {
  MultiBaasAPIResponse,
  MultiBaasAPIError,
  MultiBaasAddress,
  MultiBaasContract,
} from "./multibaasApi";

export { MultiBaasAddress, MultiBaasContract };

type Contract = TruffleContract.Contract;

// TODO: Allow customizing chains
const chain = "/chains/ethereum";

/**
 * The interface to Truffle's default deployer.
 */
interface TruffleDeployer {
  deploy<T extends any[]>(contract: Contract, ...args: T): Promise<void>;
  link(lib: Contract, destinations: Contract | Contract[]): Promise<void>;
  then<T>(fn: () => T | Promise<T>): Promise<T>;
}

/**
 * The deploy options.
 */
export interface DeployOptions {
  /**
   * Truffle's "overwrite" property.
   */
  overwrite?: boolean;
  /**
   * Overwrite the default contractLabel. If set and a duplicate is found,
   * the contract is assigned a newer version.
   */
  contractLabel?: string;
  /**
   * Version override. Will fail if another binary with the same version is found.
   */
  contractVersion?: string;
  /**
   * Overwrite the default address label. If set and a duplicate is found,
   * the address is instead updated (or returned with an error, chosen by global setting `allowUpdateAddress`).
   *
   * The auto-generated address label is never a duplicate.
   */
  addressLabel?: string;

  // and there are perhaps more parameters we don't really know (gas, from, etc.)
  [key: string]: any;
}

/**
 * The MultiBaas-connected deployer.
 */
export class Deployer {
  private config: Config;
  constructor(
    private truffleDeployer: TruffleDeployer,
    private network: string
  ) {
    this.config = getConfig();
  }

  /**
   * Returns the host.
   */
  private get host(): string {
    return this.config.deploymentID === "development"
      ? "http://localhost:8080"
      : `https://${this.config.deploymentID}.multibaas.com`;
  }

  /**
   * Perform an API request to the MultiBaas server.
   * @param path      The relative path of the API, not including `/api/vx`
   * @param config    Any params, queries,... according to Axios config.
   */
  private async request(
    path: string,
    config?: AxiosRequestConfig
  ): Promise<any> {
    let host =
      this.config.deploymentID === "development"
        ? "http://localhost:8080/api/v0"
        : `https://${this.config.deploymentID}.multibaas.com/api/v1`;
    const response = await axios(`${host}${path}`, {
      // Augment the config with some options
      ...config,
      validateStatus: (code) => code < 500, // Only fail on internal errors
      responseType: "json",
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(config?.headers ?? {}),
      },
    });
    if (response.status === 404) {
      // 404s are not that consistent
      throw new MultiBaasAPIError(path, { status: 404, message: "Not found" });
    }
    const data: MultiBaasAPIResponse = await response.data;
    if (data.message !== "success") throw new MultiBaasAPIError(path, data);
    return data.result;
  }

  /**
   * Create a MultiBaas contract.
   */
  private async createMultiBaasContract(
    contract: Contract,
    options: DeployOptions
  ): Promise<MultiBaasContract> {
    const contractLabel =
      options.contractLabel ?? contract.contractName?.toLowerCase();
    if (!contractLabel) throw new Error("Contract has no name");

    const bytecode = contract.bytecode
      ? linkBytecode(contract.bytecode, (contract as any).links).toLowerCase()
      : null;
    if (!bytecode) {
      throw new Error("Contract has no bytecode");
    }

    let contractVersion: string | null = null;
    if (options.contractVersion !== undefined) {
      // Try querying the EXACT version
      try {
        const mbContract: MultiBaasContract = await this.request(
          `/contracts/${contractLabel}/${options.contractVersion}`
        );
        if (mbContract.bin !== bytecode)
          throw new Error(
            `MultiBaas: A different "${mbContract.contractName} ${mbContract.version}" has already been deployed ${mbContract.bin} ${bytecode}`
          );
        console.log(
          `MultiBaas: Contract "${mbContract.contractName} ${mbContract.version}" already created. Skipping creation.`
        );
        return mbContract;
      } catch (e) {
        if (!(e instanceof MultiBaasAPIError) || e.response.status !== 404)
          throw e;
      }
      contractVersion = options.contractVersion;
    } else {
      // First attempt to get a version, by querying the latest version
      try {
        const mbContract: MultiBaasContract = await this.request(
          `/contracts/${contractLabel}`
        );
        // If contracts share the same bytecode, just return
        if (mbContract.bin === bytecode) {
          console.log(
            `MultiBaas: Contract "${mbContract.contractName} ${mbContract.version}" already created. Skipping creation.`
          );
          return mbContract;
        }
        let version: string = mbContract.version;
        // Increase it the way the MB frontend does
        if (version.match(/\d+$/)) {
          version = version.replace(/\d+$/, (v) => `${parseInt(v, 10) + 1}`);
        } else version = `${version}2`;
        contractVersion = contractVersion ?? version;
      } catch (e) {
        if (!(e instanceof MultiBaasAPIError)) throw e; // Not MBResponse
        if (e.response.status !== 404) throw e;
        contractVersion = contractVersion ?? "1.0";
      }
    }

    console.log(
      `MultiBaas: Creating contract "${contractLabel} ${contractVersion}"`
    );
    // Now make a request
    return this.request(`/contracts/${contractLabel}`, {
      method: "POST",
      data: {
        label: contractLabel,
        language: "solidity",
        bin: bytecode,
        // MB expects these to be JSON strings
        rawAbi: JSON.stringify(contract.abi),
        developerDoc: JSON.stringify(contract.devdoc),
        userDoc: JSON.stringify(contract.userdoc),
        contractName: contract.contractName,
        version: contractVersion,
      },
    });
  }

  /**
   * Creates a MultiBaas address instance, with labels!
   */
  private async createMultiBaasAddress(
    address: string,
    contractLabel: string,
    options: DeployOptions
  ): Promise<MultiBaasAddress> {
    // Check for conflicting addresses
    try {
      const mbAddress = await this.request(`${chain}/addresses/${address}`);
      if (mbAddress.label !== "") {
        // If an address already exists, and the user set a different address label
        if (
          options.addressLabel !== undefined &&
          options.addressLabel !== mbAddress.label
        ) {
          throw new Error(
            `MultiBaas: The address ${address} has already been created under a different label "${mbAddress.label}"`
          );
        }
        console.log(
          `MultiBaas: Address ${address} already created as "${mbAddress.label}"`
        );
        return mbAddress;
      }
    } catch (e) {
      if (!(e instanceof MultiBaasAPIError)) throw e; // Not MBResponse
      if (e.response.status !== 404) throw e;
    }

    let addressLabel = options.addressLabel;
    if (addressLabel === undefined) {
      // Attempt to get an unique addressLabel.
      const similars: Set<string> = new Set(
        (
          await this.request(
            `${chain}/addresses/similarlabels/${contractLabel}`
          )
        ).map((v: any) => v.label)
      );
      if (!similars.has(contractLabel)) addressLabel = contractLabel;
      else {
        // Same as how MB frontend does it
        let num = 2;
        while (similars.has(`${contractLabel}${num}`)) num++;
        addressLabel = `${contractLabel}${num}`;
      }
    } else {
      // We need to confirm if this address exists.
      try {
        const mbAddress = await this.request(
          `${chain}/addresses/${addressLabel}`
        );
        // Ok it does. And it's different.
        // Does the current network support label modifications?
        const allowUpdateAddress = this.config.allowUpdateAddress;
        if (
          !allowUpdateAddress ||
          (allowUpdateAddress instanceof Array &&
            allowUpdateAddress.indexOf(this.network) === -1)
        ) {
          throw new Error(
            `MultiBaas: Another address ${mbAddress.address} was created under the label "${addressLabel}"`
          );
        }
        // Modifications allowed. Just... delete it?
        console.log(
          `MultiBaas: Deleting old address ${mbAddress.address} with same label`
        );
        await this.request(`${chain}/addresses/${addressLabel}`, {
          method: "DELETE",
        });
      } catch (e) {
        if (!(e instanceof MultiBaasAPIError) || e.response.status !== 404)
          throw e;
      }
    }

    // Create it
    console.log(
      `MultiBaas: Creating address ${address} with label "${addressLabel}"`
    );
    return this.request(`${chain}/addresses`, {
      method: "POST",
      data: {
        address,
        label: addressLabel,
      },
    });
  }

  /**
   * Link a MB Contract to a MB Address.
   */
  private async linkContractToAddress(
    contract: MultiBaasContract,
    address: MultiBaasAddress
  ): Promise<MultiBaasAddress> {
    // First check if the address already has the contract
    for (const c of address.contracts) {
      if (c.label === contract.label && c.version === contract.version) {
        console.log(
          `MultiBaas: Contract "${contract.label} ${contract.version} is already linked to address "${address.label}""`
        );
        return address;
      }
    }
    console.log(
      `MultiBaas: Linking contract "${contract.label} ${contract.version} to address "${address.label}""`
    );
    return this.request(
      `${chain}/addresses/${address.label}/contracts/${contract.label}/${contract.version}`,
      { method: "PUT" }
    );
  }

  /**
   * Sets up the Deployer.
   */
  async setup(): Promise<void> {
    // Checks the API key.
    try {
      await this.request("/currentuser");
    } catch (e) {
      throw new Error(
        `MultiBaas authentication failed (check your API key?): ${e}`
      );
    }
  }

  /**
   * Deploy a contract. Takes potentially some arguments and an ending `DeployOptions` object.
   * If a DeployOptions object is included, it **must** contain the `overwrite` property.
   *
   * This is provided for drop-in compability with Truffle's default deployer. The final object might
   * be confused, if one of the arguments passed to the Contract constructor is an object containing one
   * of the `DeployOptions` key.
   * If in doubt, use the `deployWithOptions` function.
   * @param contract
   * @param args
   */
  async deploy<T extends any[]>(
    contract: Contract,
    ...args: T
  ): Promise<[MultiBaasContract, MultiBaasAddress]> {
    if (
      args.length === 0 ||
      typeof args[args.length - 1] !== "object" ||
      !("overwrite" in args[args.length - 1])
    ) {
      return this.deployWithOptions({}, contract, ...args);
    }
    const opts = args.pop();
    return this.deployWithOptions(opts, contract, ...args);
  }

  /**
   * Same as `deploy`, but the `options` object is at the start. This provides NO ambiguity.
   */
  async deployWithOptions<T extends any[]>(
    opts: Partial<DeployOptions>,
    contract: Contract,
    ...args: T
  ): Promise<[MultiBaasContract, MultiBaasAddress]> {
    const {
      contractLabel,
      contractVersion,
      addressLabel,
      ...truffleOpts
    } = opts;
    if (Object.keys(truffleOpts).length === 0)
      await this.truffleDeployer.deploy(contract, ...args);
    else await this.truffleDeployer.deploy(contract, ...args, truffleOpts);

    // Create a MultiBaas contract
    const mbContract = await this.createMultiBaasContract(contract, opts);
    // Link the deployed instance to MultiBaas contract.
    const address = await this.createMultiBaasAddress(
      (contract as any) /* magic!! */.network.address,
      mbContract.label,
      opts
    );
    const linkedAddress = await this.linkContractToAddress(mbContract, address);

    // Final message.
    console.log(`MultiBaas: Contract "${mbContract.label} ${mbContract.version}" has successfully been deployed.
- Visit the contract management page: ${this.host}/contracts/${mbContract.label}?version=${mbContract.version}
- Visit the instance management page: ${this.host}/contracts/${mbContract.label}/${linkedAddress.label}`);

    return [mbContract, linkedAddress];
  }

  async link(
    lib: Contract,
    destinations: Contract | Contract[]
  ): Promise<Contract> {
    const dests = destinations instanceof Array ? destinations : [destinations];
    await this.truffleDeployer.link(lib, dests);
    return lib;
  }
}

export default Deployer;

// Copied from https://github.com/trufflesuite/truffle/blob/22401cecd4cc194b7a3de3bbda5041dbf98f9fa3/packages/contract/lib/utils/index.js#L146
function linkBytecode(bytecode: string, links: any) {
  Object.keys(links).forEach((library_name) => {
    const library_address = links[library_name];
    const regex = new RegExp(`__${library_name}_+`, "g");

    bytecode = bytecode.replace(regex, library_address.replace("0x", ""));
  });

  return bytecode;
}
