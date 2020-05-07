// Copyright (c) 2020 Curvegrid Inc.

/**
 * A response from the MultiBaas API.
 */
export interface MultiBaasAPIResponse {
  status: number;
  message: string;
  result?: any;
}

/**
 * A special MultiBaas API error.
 */
export class MultiBaasAPIError extends Error {
  constructor(path: string, public response: MultiBaasAPIResponse) {
    super(
      `An error was returned from the MultiBaas API while calling "${path}": [${response.status}] ${response.message}`
    );
  }
}

/**
 * A MultiBaas contract interface.
 */
export interface MultiBaasContract {
  abi: {
    constructor: any;
    fallback: any;
    methods: { [methodSignature: string]: any };
    events: { [eventSignature: string]: any };
  };
  bin: string;
  compilerOptions?: string;
  compilerVersion?: string;
  contractName: string;
  developerDoc: string;
  instances: any[];
  isFavourite: boolean;
  label: string;
  language: string;
  languageVersion?: string;
  metadata?: string;
  rawAbi: string;
  src?: string;
  userDoc: string;
  version: string;
}

/**
 * A MultiBaas address interface.
 */
export interface MultiBaasAddress {
  label: string;
  address: string;
  balance: string;
  chain: string;
  isContract: boolean;
  modules: any[];
  contracts: {
    name: string;
    conflict: boolean;
    label: string;
    version: string;
  }[];
  codeAt: string;
}
