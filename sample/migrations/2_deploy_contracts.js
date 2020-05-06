const ConvertLib = artifacts.require("ConvertLib");
const MetaCoin = artifacts.require("MetaCoin");

const { Deployer } = require("truffle-multibaas-plugin");

module.exports = async function (_deployer, network) {
  const deployer = new Deployer(_deployer, network);
  await deployer.setup();

  await deployer.deploy(ConvertLib, { overwrite: false });
  await deployer.link(ConvertLib, MetaCoin);
  await deployer.deployWithOptions(MetaCoin, {
    contractVersion: "2.0",
    addressLabel: "metacoin",
  });
};
