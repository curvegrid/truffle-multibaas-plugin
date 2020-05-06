// Copyright (c) 2020 Curvegrid Inc.
import TruffleConfig from "@truffle/config";
import { readFileSync } from "fs";
import path from "path";

// The deployer's key in the truffle config.
const configKey = "multibaasDeployer";

const APIKeyEnvKey = "MB_PLUGIN_API_KEY";
const APIKeyFileName = "mb_plugin_api_file";

/**
 * Holds the configuration to the plugin.
 *
 */
interface BaseConfig {
  deploymentID: string;
  /**
   * Whether we can update addresses for labels. Takes a definitive boolean or a list of allowed networks.
   * This is a fairly destructive operation, so the default option is "false".
   */
  allowUpdateAddress?: boolean | string[];
}

/**
 * The configuration found in the truffle configuration file.
 */
interface FileConfig extends BaseConfig {
  apiKeySource: "env" | "file";
}

/**
 * The exported config interface.
 */
export interface Config extends BaseConfig {
  apiKey: string;
  allowUpdateAddress: boolean | string[];
}

// Checks whether an object is a FileConfig.
function isFileConfig(o: any): o is FileConfig {
  if (typeof o !== "object") return false;
  if (!(o.apiKeySource === "env" || o.apiKeySource === "file")) return false;
  if (typeof o.deploymentID !== "string") return false;
  if ("allowUpdateAddress" in o) {
    const value = o.allowUpdateAddress;
    if (typeof value === "object") {
      if (!(value instanceof Array)) return false;
      if (!value.every((v) => typeof v === "string")) return false;
    } else if (typeof value !== "boolean") return false;
  }
  return true;
}

/**
 * Parses and returns the config struct.
 */
export default function getConfig(): Config {
  const truffleConfig: any = TruffleConfig.detect();
  const mbConfig: any = truffleConfig[configKey];
  if (!isFileConfig(mbConfig))
    throw new Error(
      "MultiBaas deployer config not found or incorrectly configured"
    );
  let apiKey = "";
  if (mbConfig.apiKeySource === "env") {
    const env = process.env[APIKeyEnvKey];
    if (!env) {
      throw new Error(`Environment variable ${APIKeyEnvKey} not found`);
    }
    apiKey = env;
  } else {
    apiKey = readFileSync(path.join(process.cwd(), APIKeyFileName), "utf-8");
  }
  return { allowUpdateAddress: false, ...mbConfig, apiKey };
}
